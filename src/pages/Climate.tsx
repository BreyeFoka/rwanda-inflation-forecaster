import React from 'react';
import { RainfallBars } from '../components/charts/RainfallBars';
import { RainfallHistory } from '../components/charts/RainfallHistory';
import { Card, DataState, PageHeader } from '../components/ui';
import { Overview, SeriesMap, useApi } from '../lib/api';
import { DIVERGING, INK, formatPeriod, signed } from '../lib/theme';

export const Climate: React.FC = () => {
  const overview = useApi<Overview>('/overview');
  const ids = overview.data?.rainfall.flatMap(r => [r.series_id, r.series_id.replace('rain_anom', 'rain')]).join(',');
  const history = useApi<SeriesMap>(ids ? `/series?ids=${ids}&months=36` : null);

  return (
    <div className="space-y-6">
      <PageHeader title="Rainfall" description="Rain decides how good harvests are, and harvests decide food prices. Each province is compared with its usual rainfall for the same months (the 1991–2020 average)." />
      <DataState state={overview} label="rainfall data">
        {o => (
          <>
            <Card title="Last three months compared with usual" note={`Up to ${formatPeriod(o.rainfall[0].period)}. Measured at one place in each province.`}>
              <RainfallBars rainfall={o.rainfall} />
            </Card>
            <Card title="Month by month" note="Rain each month over the last three years, in millimetres">
              <div className="flex items-center gap-5 text-xs text-slate-400 mb-4">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: DIVERGING.above }} />Rainfall</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: INK.secondary }} />Usual for that month</span>
              </div>
              <DataState state={history} label="rainfall history">
                {h => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {o.rainfall.map(r => (
                      <div key={r.series_id}>
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <h3 className="text-xs text-slate-300">{r.name}</h3>
                          <span className="text-xs text-slate-400">{formatPeriod(r.period)}: <span className="font-mono text-slate-100">{r.rain_mm} mm</span>, {signed(r.anomaly_pct, '%', 0)} vs usual</span>
                        </div>
                        <RainfallHistory rain={h[r.series_id.replace('rain_anom', 'rain')].observations} anomaly={h[r.series_id].observations} />
                      </div>
                    ))}
                  </div>
                )}
              </DataState>
            </Card>
            <p className="text-xs text-slate-500 max-w-3xl">
              Rainfall is estimated from weather models and satellite data (ERA5) at one place in each province, not measured by rain gauges, so rain in your area may differ.
            </p>
          </>
        )}
      </DataState>
    </div>
  );
};
