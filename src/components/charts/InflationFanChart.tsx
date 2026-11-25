import React from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { AXIS_TICK, BAND, INK, SERIES, formatPeriod } from '../../lib/theme';
import { Forecast } from '../../lib/api';

const BNR_BAND = { lower: 2, upper: 8 };
// Quantile pairs drawn as nested bands, widest first: 10-90, 20-80, 30-70, 40-60.
const BANDS = [0, 1, 2, 3];

interface Row {
  period: string;
  actual?: number;
  median?: number;
  [band: `band${number}`]: [number, number];
}

const FanTooltip: React.FC<{ active?: boolean; payload?: { payload: Row }[] }> = ({ active, payload }) => {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  if (row.actual !== undefined) {
    return <ChartTooltip title={formatPeriod(row.period)} rows={[{ label: 'Real inflation', value: `${row.actual.toFixed(1)}%`, color: SERIES.actual }]} />;
  }
  return (
    <ChartTooltip
      title={`${formatPeriod(row.period)} (forecast)`}
      rows={[
        { label: 'Most likely', value: `${row.median!.toFixed(1)}%`, color: SERIES.forecast },
        { label: 'Likely range (8 in 10 chance)', value: `${row.band0[0].toFixed(1)} to ${row.band0[1].toFixed(1)}` },
        { label: 'More likely range (4 in 10 chance)', value: `${row.band2[0].toFixed(1)} to ${row.band2[1].toFixed(1)}` }
      ]}
    />
  );
};

export const InflationFanChart: React.FC<{ forecast: Forecast; historyMonths?: number }> = ({ forecast, historyMonths = 60 }) => {
  const history = forecast.history.slice(-historyMonths);
  const last = history[history.length - 1];
  const rows: Row[] = history.map(h => ({ period: h.period, actual: h.yoy }));
  // The fan opens from the last observation, so that row carries zero-width bands.
  const anchor = rows[rows.length - 1];
  anchor.median = last.yoy;
  BANDS.forEach(q => { anchor[`band${q}`] = [last.yoy, last.yoy]; });
  forecast.forecast.forEach(f => {
    const row: Row = { period: f.period, median: f.yoy[4] };
    BANDS.forEach(q => { row[`band${q}`] = [f.yoy[q], f.yoy[8 - q]]; });
    rows.push(row);
  });

  // Annotations come from the data: the highest month before the last year, the latest month, and the forecast's end.
  const earlier = history.slice(0, -12);
  const peak = earlier.length ? earlier.reduce((a, b) => (b.yoy > a.yoy ? b : a)) : undefined;
  const end = forecast.forecast[forecast.forecast.length - 1];
  const notes = [
    ...(peak ? [{ period: peak.period, y: peak.yoy, text: `Peak ${peak.yoy.toFixed(1)}% (${formatPeriod(peak.period)})`, color: SERIES.actual }] : []),
    { period: last.period, y: last.yoy, text: `Now ${last.yoy.toFixed(1)}%`, color: SERIES.actual },
    { period: end.period, y: end.yoy[4], text: `${formatPeriod(end.period)}: ${end.yoy[4].toFixed(1)}%`, color: SERIES.forecast }
  ];

  const extremes = rows.flatMap(r => [r.actual ?? r.band0[0], r.actual ?? r.band0[1]]);
  const yMin = Math.floor(Math.min(0, ...extremes) / 10) * 10;
  const yMax = Math.ceil(Math.max(...extremes) / 10) * 10;
  const yTicks = Array.from({ length: (yMax - yMin) / 10 + 1 }, (_, i) => yMin + i * 10);

  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">% change in prices compared with a year before</div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={rows} margin={{ top: 16, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis
            dataKey="period"
            ticks={rows.filter(r => r.period.endsWith('-01')).map(r => r.period)}
            tickFormatter={(p: string) => p.slice(0, 4)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: INK.axis }}
          />
          <YAxis domain={[yMin, yMax]} ticks={yTicks} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={52} />
          <ReferenceArea y1={BNR_BAND.lower} y2={BNR_BAND.upper} fill={BAND} fillOpacity={0.1} stroke="none" />
          <ReferenceLine y={0} stroke={INK.axis} />
          <ReferenceLine
            x={last.period}
            stroke={INK.muted}
            strokeDasharray="4 4"
            label={{ value: 'forecast', position: 'insideTopLeft', fill: INK.secondary, fontSize: 11, dx: 6 }}
          />
          {BANDS.map(q => (
            <Area key={q} dataKey={`band${q}`} type="linear" stroke="none" fill={SERIES.forecast} fillOpacity={0.16} isAnimationActive={false} activeDot={false} />
          ))}
          <Line dataKey="actual" type="linear" stroke={SERIES.actual} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2 }} />
          <Line dataKey="median" type="linear" stroke={SERIES.forecast} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2 }} />
          {notes.map(n => (
            <ReferenceDot
              key={n.text}
              x={n.period}
              y={n.y}
              r={4}
              fill={n.color}
              stroke="#0f172a"
              strokeWidth={2}
              label={{ value: n.text, position: 'top', fill: INK.primary, fontSize: 11, offset: 10 }}
            />
          ))}
          <Tooltip content={<FanTooltip />} cursor={{ stroke: INK.muted }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-400 mt-2 pl-11">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: SERIES.actual }} />Real inflation</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: SERIES.forecast }} />Forecast, most likely</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded-sm" style={{ background: SERIES.forecast, opacity: 0.45 }} />Likely range (darker means more likely)</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded-sm" style={{ background: BAND, opacity: 0.3 }} />Central bank's 2–8% target (applies to town prices)</span>
      </div>
    </div>
  );
};
