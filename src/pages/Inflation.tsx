import React, { useState } from 'react';
import { CompareLines } from '../components/charts/CompareLines';
import { InflationFanChart } from '../components/charts/InflationFanChart';
import { SeriesChart } from '../components/charts/SeriesChart';
import { MeasureStrip, measureNote } from '../components/MeasureStrip';
import { Card, DataState, PageHeader, Segmented } from '../components/ui';
import { Forecast, Overview, SeriesMap, useApi } from '../lib/api';
import { AREA, BAND, MEASURE, formatPeriod } from '../lib/theme';

const ForecastRows: React.FC<{ forecast: Forecast }> = ({ forecast }) => {
  const rows = forecast.forecast;
  const lo = Math.min(0, ...rows.map(r => r.yoy[0]));
  const hi = Math.max(...rows.map(r => r.yoy[8]));
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const target = { left: x(Math.max(2, lo)), width: x(Math.min(8, hi)) - x(Math.max(2, lo)) };
  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white" aria-hidden="true" />Most likely</li>
        <li className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-full" style={{ background: BAND, opacity: 0.45 }} aria-hidden="true" />Likely range</li>
        <li className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-slate-700/60" aria-hidden="true" />Central bank target, 2–8%</li>
      </ul>
      <ul className="space-y-1">
        {rows.map(row => {
          const [low, mid, high] = [row.yoy[0], row.yoy[4], row.yoy[8]];
          return (
            <li key={row.period} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3 py-1" title={`Likely between ${low.toFixed(1)}% and ${high.toFixed(1)}%`}>
              <span className="text-sm text-slate-300 whitespace-nowrap">{formatPeriod(row.period)}</span>
              <span className="relative h-5" aria-label={`likely between ${low.toFixed(1)}% and ${high.toFixed(1)}%`}>
                <span className="absolute inset-y-0 bg-slate-700/40" style={{ left: `${target.left}%`, width: `${target.width}%` }} />
                <span className="absolute top-1.5 h-2 rounded-full" style={{ left: `${x(low)}%`, width: `${x(high) - x(low)}%`, background: BAND, opacity: 0.45 }} />
                <span className="absolute top-1 w-3 h-3 -ml-1.5 rounded-full bg-white border-2 border-slate-900" style={{ left: `${x(mid)}%` }} />
              </span>
              <span className="text-sm font-mono font-semibold text-white text-right">{mid.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-[4.5rem_1fr_3.5rem] gap-3 mt-1 text-[11px] font-mono text-slate-500">
        <span />
        <span className="flex justify-between"><span>{lo.toFixed(0)}%</span><span>{hi.toFixed(0)}%</span></span>
        <span />
      </div>
    </div>
  );
};

export const Inflation: React.FC = () => {
  const [years, setYears] = useState(5);
  const forecast = useApi<Forecast>('/forecast');
  const overview = useApi<Overview>('/overview');
  const ids = overview.data?.components.map(c => c.series_id).join(',');
  const categories = useApi<SeriesMap>(ids ? `/series?ids=${ids}&transform=yoy&months=60` : null);
  const measures = useApi<SeriesMap>('/series?ids=cpi.urban,cpi.rural,cpi.core&transform=yoy&months=96');

  return (
    <div className="space-y-6">
      <PageHeader title="Inflation" description="Inflation is how fast prices are rising: 10% means things cost 10% more than a year ago. This page shows our forecast for the next twelve months, inflation in towns and villages, and which kinds of spending are getting more expensive." />

      <DataState state={forecast} label="the forecast">
        {f => (
          <>
            <Card title="History and forecast" note={`How much prices rose compared with the same month a year before, for the whole country. Latest data: ${formatPeriod(f.last_observed)}. The shaded area shows the likely range for the forecast.${f.interval_method === 'model' ? ' The range is temporary until the accuracy check finishes.' : ''}`}>
              <div className="flex justify-end -mt-10 mb-3">
                <Segmented label="History shown" value={years} onChange={setYears} options={[{ value: 3, label: '3 years' }, { value: 5, label: '5 years' }, { value: 7, label: '7 years' }]} />
              </div>
              <InflationFanChart forecast={f} historyMonths={years * 12} />
            </Card>

            <Card
              title="Forecast by month"
              note="The dot is our best guess; the bar is where it will probably land (8 times out of 10)"
              more={{ to: '/data', label: 'How accurate is it?' }}
            >
              <ForecastRows forecast={f} />
            </Card>
          </>
        )}
      </DataState>

      <DataState state={overview} label="the latest figures">
        {o => (
          <Card title="Inflation in towns, villages and factories" note={measureNote(o.breakdown, formatPeriod)}>
            <MeasureStrip measures={o.breakdown} />
          </Card>
        )}
      </DataState>

      <DataState state={measures} label="town and village prices">
        {m => (
          <Card title="Towns versus villages" note="How much prices rose compared with a year before. The official headline figure is for towns. 'Underlying' leaves out fresh food and fuel, whose prices jump around, to show the steadier trend.">
            <CompareLines
              unit="%"
              zeroLine
              band={{ from: 2, to: 8, label: "Central bank's target, 2–8%" }}
              series={[
                { key: 'rural', label: 'Villages (rural)', color: AREA.rural, observations: m['cpi.rural'].observations },
                { key: 'urban', label: 'Towns (official headline)', color: AREA.urban, observations: m['cpi.urban'].observations },
                { key: 'core', label: 'Underlying, towns', color: MEASURE.core, observations: m['cpi.core'].observations, dashed: true }
              ]}
            />
          </Card>
        )}
      </DataState>

      <Card title="Which kinds of spending are getting more expensive" note="Price rise compared with a year before, over the last five years. Each small chart has its own scale.">
        <DataState state={categories} label="category trends">
          {series => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              {overview.data!.components.map(c => (
                <div key={c.series_id}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="text-xs text-slate-300 truncate" title={c.name}>{c.name}</h3>
                    <span className="text-sm font-mono font-semibold text-white">{c.yoy.toFixed(1)}%</span>
                  </div>
                  <SeriesChart observations={series[c.series_id].observations} unit="%" height={120} compact zeroLine />
                </div>
              ))}
            </div>
          )}
        </DataState>
      </Card>
    </div>
  );
};
