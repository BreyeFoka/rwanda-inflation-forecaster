import React, { useState } from 'react';
import { CompareLines } from '../components/charts/CompareLines';
import { InflationFanChart } from '../components/charts/InflationFanChart';
import { SeriesChart } from '../components/charts/SeriesChart';
import { MeasureStrip, measureNote } from '../components/MeasureStrip';
import { Card, DataState, PageHeader, Segmented } from '../components/ui';
import { Backtest, Forecast, Overview, SeriesMap, useApi } from '../lib/api';
import { AREA, MEASURE, formatPeriod } from '../lib/theme';

const METHOD_LABELS: Record<string, string> = {
  persistence: 'Simple guess: next year looks like this year',
  sarima: 'Statistical model of past price patterns (seasonal ARIMA)',
  timesfm: "Google's AI forecasting model (TimesFM)",
  timesfm_covariates: "Google's AI model, also given exchange rate, oil, food and rain data",
  ensemble: 'Average of the AI model and the statistical model'
};

// Methods that need Google's TimesFM model; their rows can come from an earlier run.
const CARRIED = ['timesfm', 'timesfm_covariates', 'ensemble'];

const BacktestTable: React.FC<{ backtest: Backtest; shown: string }> = ({ backtest, shown }) => {
  const coverage = backtest.interval80_coverage_pct[shown];
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 text-left">
              <th scope="col" className="font-medium pb-2">Forecasting method</th>
              {backtest.horizons.map(h => <th scope="col" key={h} className="font-medium pb-2 text-right whitespace-nowrap">{h === 1 ? '1 month' : `${h} months`} ahead</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(backtest.mae_pp).map(([name, row]) => (
              <tr key={name} className={`border-t border-slate-800 ${name === shown ? 'bg-slate-800/50' : ''}`}>
                <th scope="row" className={`py-2 pl-2 text-left font-normal ${name === shown ? 'text-white font-semibold' : 'text-slate-300'}`}>
                  {METHOD_LABELS[name] || name}
                  {backtest.timesfm_asof && CARRIED.includes(name) && <span className="ml-2 text-xs font-normal text-slate-500">*</span>}
                  {name === shown && <span className="ml-2 text-xs font-normal text-slate-400">used on this site</span>}
                </th>
                {backtest.horizons.map(h => <td key={h} className="py-2 pr-2 text-right font-mono text-slate-200">{row[String(h)].toFixed(1)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-3xl">
        Numbers show how far each method's forecast was from the real inflation rate, on average, in percentage points (lower is better). For example, 1.0 means a forecast of 10%
        typically turned out to be 9% or 11%. We tested this by pretending to stand in each month from {formatPeriod(backtest.first_origin)} to {formatPeriod(backtest.last_origin)},
        forecasting with only the data known then, and checking against what really happened. The site uses the most accurate method. Its likely range contained the real figure
        {' '}{coverage?.['1']}% of the time one month ahead, {coverage?.['6']}% six months ahead and {coverage?.['12']}% twelve months ahead; it is designed to do so about 80% of the time.
        {backtest.timesfm_asof && (
          <>
            {' '}* The rows marked with a star come from our last full test, on data up to {formatPeriod(backtest.timesfm_asof)}, because Google's model could not be
            re-run this time. The other rows use the latest data, so the two groups are not tested on exactly the same months.
          </>
        )}
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
  const measures = useApi<SeriesMap>('/series?ids=cpi.urban,cpi.rural,cpi.core,ppi.all&transform=yoy&months=96');

  return (
    <div className="space-y-6">
      <PageHeader title="Inflation" description="Inflation is how fast prices are rising: 10% means things cost 10% more than a year ago. This page shows our forecast for the next twelve months, how accurate past forecasts were, and which kinds of spending are getting more expensive." />

      <DataState state={forecast} label="the forecast">
        {f => (
          <>
            <Card title="History and forecast" note={`How much prices rose compared with the same month a year before, for the whole country. Latest data: ${formatPeriod(f.last_observed)}. The shaded area shows the likely range for the forecast.${f.interval_method === 'model' ? ' The range is temporary until the accuracy check finishes.' : ''}`}>
              <div className="flex justify-end -mt-10 mb-3">
                <Segmented label="History shown" value={years} onChange={setYears} options={[{ value: 3, label: '3 years' }, { value: 5, label: '5 years' }, { value: 7, label: '7 years' }]} />
              </div>
              <InflationFanChart forecast={f} historyMonths={years * 12} />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card title="Forecast by month" note="Most likely inflation rate, and the range it will probably fall in (8 times out of 10)" className="lg:col-span-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 text-left">
                      <th scope="col" className="font-medium pb-2">Month</th>
                      <th scope="col" className="font-medium pb-2 text-right">Most likely</th>
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
              <Card title="How accurate is the forecast?" note="We tested each method on the past six years" className="lg:col-span-3">
                <DataState state={backtest} label="the accuracy check">
                  {b => <BacktestTable backtest={b} shown={f.variant} />}
                </DataState>
              </Card>
            </div>
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

      <DataState state={measures} label="town, village and factory prices">
        {m => (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <Card title="Factory prices versus shop prices" note="When the prices Rwandan producers charge go up, shop prices often follow a few months later, so factory prices are an early warning.">
              <CompareLines
                unit="%"
                zeroLine
                series={[
                  { key: 'ppi', label: 'Factory and producer prices', color: MEASURE.ppi, observations: m['ppi.all'].observations },
                  { key: 'urban', label: 'Shop prices in towns', color: AREA.urban, observations: m['cpi.urban'].observations, dashed: true }
                ]}
              />
            </Card>
          </div>
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
