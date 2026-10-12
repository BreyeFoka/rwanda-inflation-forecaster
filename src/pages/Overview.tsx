import React from 'react';
import { CategoryBars } from '../components/charts/CategoryBars';
import { InflationFanChart } from '../components/charts/InflationFanChart';
import { RainfallBars } from '../components/charts/RainfallBars';
import { Delta } from '../components/Delta';
import { Card, DataState, PageHeader, StatTile } from '../components/ui';
import { Forecast, Indicator, Overview as OverviewData, SeriesMap, useApi } from '../lib/api';
import { SERIES, formatPeriod, formatValue, signed } from '../lib/theme';

const TILE_SERIES = ['fx.usd_rwf', 'commodity.brent'];

export const Overview: React.FC = () => {
  const overview = useApi<OverviewData>('/overview');
  const forecast = useApi<Forecast>('/forecast');
  const sparks = useApi<SeriesMap>(`/series?ids=${TILE_SERIES.join(',')}&months=36`);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Where Rwanda's prices stand today, where the model expects them to go, and what is moving them." />
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
                      label={`National inflation, ${formatPeriod(inf.period)}`}
                      value={`${inf.yoy.toFixed(1)}%`}
                      detail={
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1"><Delta value={inf.yoy - inf.yoy_prev_month} unit=" pp" /> on last month</span>
                          <span>prices {signed(inf.mom, '%')} in the month</span>
                        </span>
                      }
                      spark={f.history.slice(-36).map(h => h.yoy)}
                      sparkColor={SERIES.actual}
                    />
                    <StatTile label={`Forecast for ${formatPeriod(in3.period)}`} value={`${in3.yoy[4].toFixed(1)}%`} detail={`Likely range ${in3.yoy[0].toFixed(1)} to ${in3.yoy[8].toFixed(1)}`} />
                    <StatTile label={`Forecast for ${formatPeriod(in12.period)}`} value={`${in12.yoy[4].toFixed(1)}%`} detail={`Likely range ${in12.yoy[0].toFixed(1)} to ${in12.yoy[8].toFixed(1)}`} />
                    {tiles.map(t => (
                      <StatTile
                        key={t.series_id}
                        label={`${t.name.split(' (')[0].replace(' exchange rate', '')}, ${formatPeriod(t.period)}`}
                        value={formatValue(t.value)}
                        detail={<span className="flex items-center gap-1"><Delta value={t.change_yoy} unit={t.change_unit} /> on a year ago</span>}
                        spark={sparks.data?.[t.series_id]?.observations.map(x => x.value)}
                      />
                    ))}
                  </div>

                  <Card
                    title="Inflation: history and forecast"
                    note={`National consumer prices, % change on a year earlier. Data to ${formatPeriod(f.last_observed)}.`}
                    more={{ to: '/inflation', label: 'Forecast details' }}
                  >
                    <InflationFanChart forecast={f} />
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Where prices are rising" note={`% change on a year earlier, ${formatPeriod(o.components[0].period)}`} more={{ to: '/inflation', label: 'Trends by category' }}>
                      <CategoryBars components={o.components} />
                    </Card>
                    <Card title="Rainfall, last three months" note={`Against the 1991–2020 normal, to ${formatPeriod(o.rainfall[0].period)}`} more={{ to: '/climate', label: 'Rainfall by province' }}>
                      <RainfallBars rainfall={o.rainfall} />
                    </Card>
                  </div>
                </>
              );
            }}
          </DataState>
        )}
      </DataState>
    </div>
  );
};
