import React from 'react';
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Observation } from '../../lib/api';
import { AXIS_TICK, DIVERGING, INK, formatPeriod, signed } from '../../lib/theme';
import { ChartTooltip } from '../ChartTooltip';

interface Row {
  period: string;
  rain: number;
  normal: number;
  anomaly: number;
}

/** Monthly rainfall as bars against the 1991-2020 normal for the same calendar month. */
export const RainfallHistory: React.FC<{ rain: Observation[]; anomaly: Observation[]; height?: number }> = ({ rain, anomaly, height = 170 }) => {
  const anomalyByPeriod = new Map(anomaly.map(a => [a.period, a.value]));
  const rows: Row[] = rain.map(r => {
    const a = anomalyByPeriod.get(r.period) ?? 0;
    return { period: r.period, rain: r.value, anomaly: a, normal: r.value / (1 + a / 100) };
  });

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: Row }[] }) => {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    return (
      <ChartTooltip
        title={formatPeriod(row.period)}
        rows={[
          { label: 'Rainfall', value: `${row.rain.toFixed(0)} mm`, color: DIVERGING.above },
          { label: 'Normal for the month', value: `${row.normal.toFixed(0)} mm`, color: INK.secondary },
          { label: 'Difference', value: signed(row.anomaly, '%', 0) }
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
        <XAxis
          dataKey="period"
          ticks={rows.filter(r => r.period.endsWith('-01')).map(r => r.period)}
          tickFormatter={(p: string) => p.slice(0, 4)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: INK.axis }}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickCount={3} width={44} />
        <Tooltip content={renderTooltip} cursor={{ fill: INK.grid }} />
        <Bar dataKey="rain" fill={DIVERGING.above} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        <Line dataKey="normal" type="stepAfter" stroke={INK.secondary} strokeWidth={1.5} dot={false} isAnimationActive={false} activeDot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
