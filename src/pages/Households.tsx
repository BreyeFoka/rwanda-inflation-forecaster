import React from 'react';
import { CompareLines } from '../components/charts/CompareLines';
import { ThenNowBars } from '../components/charts/ThenNowBars';
import { Card, DataState, PageHeader, StatTile } from '../components/ui';
import { Poverty, SeriesMap, useApi } from '../lib/api';
import { AREA, formatPeriod } from '../lib/theme';

const rwf = (v: number) => `RWF ${Math.round(v).toLocaleString('en-US')}`;
const pct = (v: number) => `${v.toFixed(1)}%`;

const VulnerabilityTable: React.FC<{ p: Poverty }> = ({ p }) => {
  const foodShock = p.shocks.main_shock.find(s => s.name === 'High food prices');
  const farmWages = p.income_source.find(s => s.name === 'Farm wages');
  const rows: [string, number, number][] = [
    ['…faced a serious setback in the past year', p.shocks.any_severe.poor, p.shocks.any_severe.non_poor],
    ...(foodShock ? [['…said the worst setback was high food prices', foodShock.poor, foodShock.non_poor] as [string, number, number]] : []),
    ...(farmWages ? [['…earn most from paid farm work', farmWages.poor, farmWages.non_poor] as [string, number, number]] : []),
    ['…have a savings account', p.finance.savings_account.poor, p.finance.savings_account.non_poor],
    ['…use mobile money', p.finance.mobile_money.poor, p.finance.mobile_money.non_poor]
  ];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-400 text-left">
          <th scope="col" className="font-medium pb-2">Share of families who…</th>
          <th scope="col" className="font-medium pb-2 text-right">Poor families</th>
          <th scope="col" className="font-medium pb-2 text-right">Other families</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, poor, nonPoor]) => (
          <tr key={label} className="border-t border-slate-800">
            <th scope="row" className="py-2 text-left font-normal text-slate-300">{label}</th>
            <td className="py-2 text-right font-mono text-white">{pct(poor)}</td>
            <td className="py-2 text-right font-mono text-slate-400">{pct(nonPoor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const ProvinceTable: React.FC<{ p: Poverty }> = ({ p }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-400 text-left">
          <th scope="col" className="font-medium pb-2">Place</th>
          <th scope="col" className="font-medium pb-2 text-right">Below poverty line</th>
          <th scope="col" className="font-medium pb-2 text-right">Can't afford enough food</th>
          <th scope="col" className="font-medium pb-2 text-right whitespace-nowrap">Typical yearly spending per adult</th>
          <th scope="col" className="font-medium pb-2 text-right">Inequality (0–100)</th>
          <th scope="col" className="font-medium pb-2 text-right">Have electricity</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {[...p.provinces, ...p.areas, { ...p.national, name: 'Rwanda' }].map(r => (
          <tr key={r.name} className={`border-t border-slate-800 ${r.name === 'Rwanda' ? 'font-semibold' : ''}`}>
            <th scope="row" className="py-1.5 text-left font-sans font-normal text-slate-300">{r.name}</th>
            <td className="py-1.5 text-right text-white">{pct(r.poor_2024)}</td>
            <td className="py-1.5 text-right text-slate-300">{pct(r.extreme_2024)}</td>
            <td className="py-1.5 text-right text-slate-300 whitespace-nowrap">{rwf(r.median_consumption_2024)}</td>
            <td className="py-1.5 text-right text-slate-300">{r.gini.toFixed(1)}</td>
            <td className="py-1.5 text-right text-slate-300">{pct(r.electricity_2024)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Households: React.FC = () => {
  const poverty = useApi<Poverty>('/poverty');
  const yoy = useApi<SeriesMap>('/series?ids=cpi.all,cpi.urban,cpi.rural,cpi.urban_food,cpi.rural_food&transform=yoy&months=72');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Poverty and prices"
        description="Who rising prices hurt most. Rwanda's 2024 national household survey shows where poorer families live and how they get by; official price figures show what they are paying now."
      />
      <DataState state={poverty} label="the poverty profile">
        {p => {
          const n = p.national;
          const now = Object.fromEntries(p.inflation_now.map(b => [b.series_id, b]));
          const rural = now['cpi.rural'];
          const urban = now['cpi.urban'];
          const ruralFood = now['cpi.rural_food'];
          const urbanFood = now['cpi.urban_food'];
          const rise = p.price_rise_since_survey_pct;
          const w = p.cpi_food_weight_pct;
          const lineNow = n.poverty_line_rwf * (1 + rise.rural / 100);
          return (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="People below the poverty line, 2024" value={pct(n.poor_2024)} detail={`Down from ${pct(n.poor_2017)} in 2017. ${pct(n.extreme_2024)} cannot afford enough food.`} />
                <StatTile label={`Price rise in villages, ${formatPeriod(rural.period)}`} value={pct(rural.yoy)} detail={`Towns: ${pct(urban.yoy)}. A year ago it was ${pct(rural.yoy_12m_ago)} in villages and ${pct(urban.yoy_12m_ago)} in towns.`} />
                <StatTile label={`Food price rise in villages, ${formatPeriod(ruralFood.period)}`} value={pct(ruralFood.yoy)} detail={`Village families spend ${w.rural}% of their budget on food; town families ${w.urban}%.`} />
                <StatTile label="Price rise since the poverty line was set" value={`+${rise.rural.toFixed(0)}%`} detail={`Village prices, Jan 2024 to ${formatPeriod(rise.to)}. Towns: +${rise.urban.toFixed(0)}%.`} />
              </div>

              <Card title="Why this matters" note="What the figures on this page tell us">
                <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5 max-w-4xl leading-relaxed">
                  <li>
                    Prices are rising faster in villages ({pct(rural.yoy)} in a year) than in towns ({pct(urban.yoy)}), and food prices in villages faster still ({pct(ruralFood.yoy)}, against {pct(urbanFood.yoy)} in towns).
                    Villages are where most poor families live ({pct(p.areas.find(a => a.name === 'Rural')!.poor_2024)} below the poverty line, against {pct(p.areas.find(a => a.name === 'Urban')!.poor_2024)} in towns), and they spend more of their money on food.
                  </li>
                  <li>
                    The poverty line was set at {rwf(n.poverty_line_rwf)} per adult a year, at January 2024 prices. Because village prices have risen since, buying the same things in {formatPeriod(rise.to)} costs about {rwf(lineNow)}.
                    Families whose income has not risen as fast have probably slipped back below the line, so today's poverty is likely higher than the 2024 figures.
                  </li>
                  <li>
                    The official inflation figure only covers towns, so it misses this pressure in villages. Village and food prices should be watched alongside it when planning support for poor families.
                  </li>
                  <li>
                    {pct(p.finance.mobile_money.poor)} of poor families use mobile money, but only {pct(p.finance.savings_account.poor)} have a savings account, so mobile money is the best way to get cash support to most of them quickly.
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mt-3">These figures show what happens together; they don't prove what causes what. The survey was done before the recent jump in prices; the next survey will show its effect directly.</p>
              </Card>

              <DataState state={yoy} label="town and village prices">
                {s => (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Price rises in towns and villages" note="Everything families buy, compared with a year before, over the last six years">
                      <CompareLines
                        unit="%"
                        zeroLine
                        series={[
                          { key: 'rural', label: 'Villages', color: AREA.rural, observations: s['cpi.rural'].observations },
                          { key: 'urban', label: 'Towns (official figure)', color: AREA.urban, observations: s['cpi.urban'].observations },
                          { key: 'all', label: 'Whole country', color: AREA.national, observations: s['cpi.all'].observations, dashed: true }
                        ]}
                      />
                    </Card>
                    <Card title="Food price rises in towns and villages" note="Food and soft drinks, compared with a year before">
                      <CompareLines
                        unit="%"
                        zeroLine
                        series={[
                          { key: 'rural', label: 'Food in villages', color: AREA.rural, observations: s['cpi.rural_food'].observations },
                          { key: 'urban', label: 'Food in towns', color: AREA.urban, observations: s['cpi.urban_food'].observations }
                        ]}
                      />
                    </Card>
                  </div>
                )}
              </DataState>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Poverty by province" note="Share of people living below the poverty line">
                  <ThenNowBars
                    color={AREA.national}
                    nowLabel="2024"
                    thenLabel="2017"
                    rows={[...p.provinces, { ...n, name: 'Rwanda' }].map(r => ({ name: r.name, then: r.poor_2017, now: r.poor_2024 }))}
                  />
                </Card>
                <Card title="Extreme poverty by province" note="Share of people who cannot afford enough food">
                  <ThenNowBars
                    color={AREA.national}
                    nowLabel="2024"
                    thenLabel="2017"
                    rows={[...p.provinces, { ...n, name: 'Rwanda' }].map(r => ({ name: r.name, then: r.extreme_2017, now: r.extreme_2024 }))}
                  />
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card title="How poor families differ" note="National household survey, 2024" className="lg:col-span-2">
                  <VulnerabilityTable p={p} />
                </Card>
                <Card title="Living standards by place" note="National household survey, 2024. Spending is what a typical adult spends in a year, at January 2024 prices. Inequality: 0 means everyone has the same, 100 means one person has everything." className="lg:col-span-3">
                  <ProvinceTable p={p} />
                </Card>
              </div>

              <Card title="About this data">
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-5 max-w-4xl leading-relaxed">
                  <li>{p.survey}. Source: <a className="text-slate-200 underline" href={p.source_url} target="_blank" rel="noreferrer">{p.source}</a>.</li>
                  {p.notes.map(note => <li key={note}>{note}</li>)}
                  <li>Town and village prices: NISR's consumer price index, the official measure of shop prices.</li>
                  <li>
                    We found two typing errors in NISR's published tables: town and village poverty is printed as 16.7% and 31.6% in one table but 12.7% and 30.6% in another (the second matches the other figures),
                    and the East's change in extreme poverty is printed as +9 when the figures show a fall of 5.2. This page uses the consistent figures and works out every change itself.
                  </li>
                </ul>
              </Card>
            </>
          );
        }}
      </DataState>
    </div>
  );
};
