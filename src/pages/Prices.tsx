import React, { useState } from 'react';
import { SeriesChart } from '../components/charts/SeriesChart';
import { Delta } from '../components/Delta';
import { Sparkline } from '../components/Sparkline';
import { Card, DataState, PageHeader } from '../components/ui';
import { Indicator, SeriesForecast, SeriesMap, useApi } from '../lib/api';
import { formatPeriod } from '../lib/theme';

const shortName = (i: Indicator) => i.name.split(':')[0];
const shortUnit = (i: Indicator) => i.unit.replace('RWF per ', 'RWF/');

export const Prices: React.FC = () => {
  const foods = useApi<Indicator[]>('/indicators?group=food');
  const [selected, setSelected] = useState('food.beans');
  const ids = foods.data?.map(f => f.series_id).join(',');
  const history = useApi<SeriesMap>(ids ? `/series?ids=${ids}&months=60` : null);
  const forecast = useApi<SeriesForecast>(`/forecast/series?series_id=${selected}&horizon=6`);

  return (
    <div className="space-y-6">
      <PageHeader title="Food prices" description="Retail prices of staple foods from market monitoring, as the median across surveyed markets. Select an item to see its history and a six-month projection." />
      <DataState state={foods} label="food prices">
        {items => {
          const current = items.find(i => i.series_id === selected) ?? items[0];
          return (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card title="Staples" note="Latest price and change" className="lg:col-span-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 text-left">
                      <th scope="col" className="font-medium pb-2">Item</th>
                      <th scope="col" className="font-medium pb-2 text-right">Price, RWF</th>
                      <th scope="col" className="font-medium pb-2 w-20"><span className="sr-only">Three-year trend</span></th>
                      <th scope="col" className="font-medium pb-2 text-right">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr
                        key={i.series_id}
                        onClick={() => setSelected(i.series_id)}
                        className={`border-t border-slate-800 cursor-pointer transition-colors ${i.series_id === current.series_id ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
                      >
                        <th scope="row" className="py-2 pl-2 text-left font-normal">
                          <button onClick={() => setSelected(i.series_id)} aria-pressed={i.series_id === current.series_id} className="text-left text-slate-100">
                            {shortName(i)}
                          </button>
                          <div className="text-xs text-slate-500">{formatPeriod(i.period)}</div>
                        </th>
                        <td className="py-2 text-right font-mono text-slate-100 whitespace-nowrap">{Math.round(i.value).toLocaleString()}</td>
                        <td className="py-2 px-2"><Sparkline values={history.data?.[i.series_id]?.observations.slice(-36).map(o => o.value) ?? []} height={24} /></td>
                        <td className="py-2 pr-2 text-right text-xs"><Delta value={i.change_yoy} unit="%" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card title={shortName(current)} note={`${shortUnit(current)}, five-year history with a six-month TimesFM projection`} className="lg:col-span-3">
                <DataState state={history} label="price history">
                  {h => <SeriesChart observations={h[current.series_id].observations} forecast={forecast.data?.series_id === current.series_id ? forecast.data.forecast : undefined} unit={shortUnit(current)} height={320} />}
                </DataState>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  The dashed line and shaded band are the model's median and 10% to 90% range. Unlike the inflation forecast, projections for individual foods have not been
                  tested against history here, so treat them as indicative. Prices come from {current.source}.
                </p>
              </Card>
            </div>
          );
        }}
      </DataState>
    </div>
  );
};
