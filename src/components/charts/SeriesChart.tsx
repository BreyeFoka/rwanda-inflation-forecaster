import React from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Observation } from '../../lib/api';
import { AXIS_TICK, INK, SERIES, formatPeriod, formatValue } from '../../lib/theme';
import { ChartTooltip } from '../ChartTooltip';

interface Row {
  period: string;
  actual?: number;
  median?: number;
  range?: [number, number];
}

interface Props {
  observations: Observation[];
  /** Optional forecast: nine quantiles (10%..90%) per future month. */
  forecast?: { period: string; values: number[] }[];
  unit: string;
  height?: number;
  color?: string;
  /** Small-multiple mode: fewer ticks, no grid. */
  compact?: boolean;
  zeroLine?: boolean;
}

/** One series over time, optionally continued by a forecast median and its 10%-90% range. */
export const SeriesChart: React.FC<Props> = ({ observations, forecast, unit, height = 260, color = SERIES.actual, compact, zeroLine }) => {
  const rows: Row[] = observations.map(o => ({ period: o.period, actual: o.value }));
  if (forecast?.length && rows.length) {
    const anchor = rows[rows.length - 1];
    anchor.median = anchor.actual;
    anchor.range = [anchor.actual!, anchor.actual!];
    forecast.forEach(f => rows.push({ period: f.period, median: f.values[4], range: [f.values[0], f.values[8]] }));
  }
  const januaries = rows.filter(r => r.period.endsWith('-01')).map(r => r.period);
  const yearStep = Math.ceil(januaries.length / (compact ? 3 : 10));
  const suffix = unit === '%' ? '%' : '';

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: Row }[] }) => {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    if (row.actual !== undefined) {
      return <ChartTooltip title={formatPeriod(row.period)} rows={[{ label: 'Actual', value: `${formatValue(row.actual)}${suffix}`, color }]} />;
    }
    return (
      <ChartTooltip
        title={`${formatPeriod(row.period)} (forecast)`}
        rows={[
          { label: 'Median', value: `${formatValue(row.median!)}${suffix}`, color: SERIES.forecast },
          { label: '10% to 90% range', value: `${formatValue(row.range![0])} to ${formatValue(row.range![1])}` }
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {!compact && <CartesianGrid stroke={INK.grid} vertical={false} />}
        <XAxis
          dataKey="period"
          ticks={januaries.filter((_, i) => i % yearStep === 0)}
          tickFormatter={(p: string) => p.slice(0, 4)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: INK.axis }}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickCount={compact ? 3 : 5}
          width={compact ? 44 : 56}
          tickFormatter={(v: number) => `${formatValue(v)}${suffix}`}
        />
        {zeroLine && <ReferenceLine y={0} stroke={INK.axis} />}
        {forecast?.length ? <ReferenceLine x={observations[observations.length - 1].period} stroke={INK.muted} strokeDasharray="4 4" /> : null}
        <Area dataKey="range" type="linear" stroke="none" fill={SERIES.forecast} fillOpacity={0.25} isAnimationActive={false} activeDot={false} />
        <Line dataKey="actual" type="linear" stroke={color} strokeWidth={compact ? 1.5 : 2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2 }} />
        <Line dataKey="median" type="linear" stroke={SERIES.forecast} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2 }} />
        <Tooltip content={renderTooltip} cursor={{ stroke: INK.muted }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
