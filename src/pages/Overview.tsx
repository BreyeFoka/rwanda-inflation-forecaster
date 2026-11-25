import React from 'react';
import { Link } from 'react-router-dom';
import { CategoryBars } from '../components/charts/CategoryBars';
import { InflationFanChart } from '../components/charts/InflationFanChart';
import { Delta } from '../components/Delta';
import { MeasureStrip, measureNote } from '../components/MeasureStrip';
import { Card, DataState, StatTile } from '../components/ui';
import { Forecast, Indicator, Overview as OverviewData, SeriesMap, useApi } from '../lib/api';
import { SERIES, formatPeriod, formatValue, signed } from '../lib/theme';

const TILE_SERIES = ['fx.usd_rwf', 'commodity.brent'];
// The overview keeps three measures; the Inflation page shows the rest.
const OVERVIEW_MEASURES = ['cpi.urban', 'cpi.rural', 'ppi.all'];

export const Overview: React.FC = () => {
  const overview = useApi<OverviewData>('/overview');
  const forecast = useApi<Forecast>('/forecast');
  const sparks = useApi<SeriesMap>(`/series?ids=${TILE_SERIES.join(',')}&months=36`);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-linear-to-br from-emerald-950/60 via-slate-900/60 to-slate-950 px-6 py-8 sm:px-10 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">NISR Big Data Hackathon 2026</p>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mt-2 max-w-3xl">
          Rwanda's inflation today, and where it's heading
        </h1>
        <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-3xl leading-relaxed">
          This site shows how fast prices are rising in Rwanda and predicts the inflation rate for the next twelve months, so government institutions can act
          early to support people through price rises, and families and businesses can plan their budgets ahead. It uses official figures from the National
          Institute of Statistics of Rwanda (NISR), and every prediction method was checked against what really happened before we used it.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 max-w-4xl text-sm">
          <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="font-semibold text-white">Current inflation</div>
            <div className="text-slate-400 mt-1">The latest inflation rate from NISR, and which kinds of spending are pushing it up.</div>
          </li>
          <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="font-semibold text-white">12-month forecast</div>
            <div className="text-slate-400 mt-1">A forecast with a likely range. We tested several methods on six past years, including Google's AI model, and use the most accurate one.</div>
          </li>
          <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="font-semibold text-white">What's behind it</div>
            <div className="text-slate-400 mt-1">Food prices, the exchange rate, world oil prices, rainfall, factory prices, and prices and poverty in towns and villages.</div>
          </li>
        </ul>
        <p className="text-xs text-slate-400 mt-4 max-w-3xl">
          Supports NST2's goals of economic stability and poverty reduction, and Vision 2050's aim of high living standards for all Rwandans.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link to="/inflation" className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm">See the forecast</Link>
          <Link to="/prices" className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-100 font-semibold text-sm">Food prices</Link>
          <Link to="/analyst" className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-100 font-semibold text-sm">Ask the AI analyst</Link>
        </div>
      </section>
      <DataState state={overview} label="the latest figures">
        {o => (
          <DataState state={forecast} label="the forecast">
            {f => {
              const inf = o.inflation;
              const in3 = f.forecast[2];
              const in12 = f.forecast[f.forecast.length - 1];
              const tiles = TILE_SERIES.map(id => o.indicators.find(i => i.series_id === id)).filter((i): i is Indicator => Boolean(i));
              return (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <StatTile
                      className="col-span-2"
                      emphasis
                      label={`Inflation, whole country, ${formatPeriod(inf.period)}`}
                      value={`${inf.yoy.toFixed(1)}%`}
                      detail={
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1"><Delta value={inf.yoy - inf.yoy_prev_month} unit=" pp" /> since last month</span>
                          <span>prices {signed(inf.mom, '%')} in one month</span>
                        </span>
                      }
                      spark={f.history.slice(-36).map(h => h.yoy)}
                      sparkColor={SERIES.actual}
                    />
                    <StatTile label={`Expected inflation, ${formatPeriod(in3.period)}`} value={`${in3.yoy[4].toFixed(1)}%`} detail={`Probably between ${in3.yoy[0].toFixed(1)}% and ${in3.yoy[8].toFixed(1)}%`} />
                    <StatTile label={`Expected inflation, ${formatPeriod(in12.period)}`} value={`${in12.yoy[4].toFixed(1)}%`} detail={`Probably between ${in12.yoy[0].toFixed(1)}% and ${in12.yoy[8].toFixed(1)}%`} />
                    {tiles.map(t => (
                      <StatTile
                        key={t.series_id}
                        label={`${t.name.split(' (')[0].replace(' exchange rate', '')}, ${formatPeriod(t.period)}`}
                        value={formatValue(t.value)}
                        detail={<span className="flex items-center gap-1"><Delta value={t.change_yoy} unit={t.change_unit} /> since a year ago</span>}
                        spark={sparks.data?.[t.series_id]?.observations.map(x => x.value)}
                      />
                    ))}
                  </div>

                  <Card title="Inflation in towns, villages and factories" note={measureNote(o.breakdown.filter(b => OVERVIEW_MEASURES.includes(b.series_id)), formatPeriod)} more={{ to: '/inflation', label: 'See all measures' }}>
                    <MeasureStrip measures={o.breakdown.filter(b => OVERVIEW_MEASURES.includes(b.series_id))} />
                  </Card>

                  <Card
                    title="Inflation so far, and what comes next"
                    note={`How much prices rose compared with a year before, for the whole country. Latest data: ${formatPeriod(f.last_observed)}.`}
                    more={{ to: '/inflation', label: 'Forecast details' }}
                  >
                    <InflationFanChart forecast={f} />
                  </Card>

                  <Card title="Where prices are rising" note={`Price rise compared with a year before, by type of spending, ${formatPeriod(o.components[0].period)}`} more={{ to: '/inflation', label: 'See the trends' }}>
                    <CategoryBars components={o.components} />
                  </Card>
                </>
              );
            }}
          </DataState>
        )}
      </DataState>
    </div>
  );
};
