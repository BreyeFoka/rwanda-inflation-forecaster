import React, { useState } from 'react';
import { InflationFanChart } from '../components/charts/InflationFanChart';
import { SeriesChart } from '../components/charts/SeriesChart';
import { Card, DataState, PageHeader, Segmented } from '../components/ui';
import { Backtest, Forecast, Overview, SeriesMap, useApi } from '../lib/api';
import { formatPeriod } from '../lib/theme';

const METHOD_LABELS: Record<string, string> = {
  persistence: 'No change (inflation stays where it is)',
  sarima: 'Seasonal ARIMA',
  timesfm: 'TimesFM 3.0',
  timesfm_covariates: 'TimesFM 3.0 with driver data',
  ensemble: 'Average of TimesFM and ARIMA'
};

const BacktestTable: React.FC<{ backtest: Backtest; shown: string }> = ({ backtest, shown }) => {
  const coverage = backtest.interval80_coverage_pct[shown];
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 text-left">
              <th scope="col" className="font-medium pb-2">Method</th>
              {backtest.horizons.map(h => <th scope="col" key={h} className="font-medium pb-2 text-right whitespace-nowrap">{h} mo ahead</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(backtest.mae_pp).map(([name, row]) => (
              <tr key={name} className={`border-t border-slate-800 ${name === shown ? 'bg-slate-800/50' : ''}`}>
                <th scope="row" className={`py-2 pl-2 text-left font-normal ${name === shown ? 'text-white font-semibold' : 'text-slate-300'}`}>
                  {METHOD_LABELS[name] || name}
                  {name === shown && <span className="ml-2 text-xs font-normal text-slate-400">used on this site</span>}
                </th>
                {backtest.horizons.map(h => <td key={h} className="py-2 pr-2 text-right font-mono text-slate-200">{row[String(h)].toFixed(1)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-3xl">
        Average miss in percentage points of inflation. Each method forecast every month from {formatPeriod(backtest.first_origin)} to {formatPeriod(backtest.last_origin)} using
        only the data available at that time. The forecast range held the actual outcome {coverage?.['1']}% of the time one month ahead and {coverage?.['12']}% twelve months
        ahead; 80% would be ideal, so the range is too narrow at long horizons. Lowest average miss: {METHOD_LABELS[backtest.best_overall] || backtest.best_overall}.
      </p>
    </>
  );
};

export const Inflation: React.FC = () => {
  const [years, setYears] = useState(5);
  const forecast = useApi<Forecast>('/forecast');
  const backtest = useApi<Backtest>('/backtest');
  const overview = useApi<Overview>('/overview');
  const ids = overview.data?.components.map(c => c.series_id).join(',');
  const categories = useApi<SeriesMap>(ids ? `/series?ids=${ids}&transform=yoy&months=60` : null);

  return (
    <div className="space-y-6">
      <PageHeader title="Inflation" description="The twelve-month forecast of national consumer price inflation, how accurate the method has been, and the trend in each spending category." />

      <DataState state={forecast} label="the forecast">
        {f => (
          <>
            <Card title="History and forecast" note={`% change on a year earlier. Model: ${f.model}. Data to ${formatPeriod(f.last_observed)}.`}>
              <div className="flex justify-end -mt-10 mb-3">
                <Segmented label="History shown" value={years} onChange={setYears} options={[{ value: 3, label: '3 years' }, { value: 5, label: '5 years' }, { value: 7, label: '7 years' }]} />
              </div>
              <InflationFanChart forecast={f} historyMonths={years * 12} />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card title="Forecast by month" note="Median and the 10% to 90% range" className="lg:col-span-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 text-left">
                      <th scope="col" className="font-medium pb-2">Month</th>
                      <th scope="col" className="font-medium pb-2 text-right">Median</th>
                      <th scope="col" className="font-medium pb-2 text-right">Likely range</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {f.forecast.map(row => (
                      <tr key={row.period} className="border-t border-slate-800">
                        <th scope="row" className="py-1.5 text-left font-sans font-normal text-slate-300">{formatPeriod(row.period)}</th>
                        <td className="py-1.5 text-right text-white">{row.yoy[4].toFixed(1)}%</td>
                        <td className="py-1.5 text-right text-slate-400">{row.yoy[0].toFixed(1)} to {row.yoy[8].toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Card title="How far to trust the forecast" note="Tested on the past six years" className="lg:col-span-3">
                <DataState state={backtest} label="the accuracy test">
                  {b => <BacktestTable backtest={b} shown={f.variant} />}
                </DataState>
              </Card>
            </div>
          </>
        )}
      </DataState>

      <Card title="Trend by spending category" note="% change on a year earlier, last five years. Each chart has its own scale.">
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
