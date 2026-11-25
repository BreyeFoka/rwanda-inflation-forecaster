import React from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Observation } from '../../lib/api';
import { AXIS_TICK, INK, formatPeriod, formatValue } from '../../lib/theme';
import { ChartTooltip } from '../ChartTooltip';

export interface CompareSeries {
  key: string;
  label: string;
  color: string;
  observations: Observation[];
  dashed?: boolean;
}

interface Props {
  series: CompareSeries[];
  unit: string;
  height?: number;
  zeroLine?: boolean;
  /** Horizontal reference band, e.g. an inflation target. */
  band?: { from: number; to: number; label: string };
  /** Text above the y-axis naming its unit. */
  axisTitle?: string;
}

/** Several series of the same unit on one axis, with a legend and a label at each line's end. */
export const CompareLines: React.FC<Props> = ({ series, unit, height = 300, zeroLine, band, axisTitle }) => {
  const byPeriod = new Map<string, Record<string, number | string>>();
  series.forEach(s => s.observations.forEach(o => {
    const row = byPeriod.get(o.period) ?? { period: o.period };
    row[s.key] = o.value;
    byPeriod.set(o.period, row);
  }));
  const rows = [...byPeriod.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const januaries = rows.filter(r => String(r.period).endsWith('-01')).map(r => String(r.period));
  const step = Math.ceil(januaries.length / 8);
  const suffix = unit === '%' ? '%' : '';

  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: Record<string, number | string> }[] }) => {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    return (
      <ChartTooltip
        title={formatPeriod(String(row.period))}
        rows={series.filter(s => row[s.key] !== undefined).map(s => ({ label: s.label, value: `${formatValue(Number(row[s.key]))}${suffix}`, color: s.color }))}
      />
    );
  };

  // Direct label at the last point of each line; text stays in text ink, the swatch carries identity.
  const lastIndex = (key: string) => rows.reduce((last, r, i) => (r[key] !== undefined ? i : last), -1);
  const endLabel = (s: CompareSeries) => (props: { x?: number | string; y?: number | string; index?: number; value?: unknown }) => {
    if (props.index !== lastIndex(s.key) || props.x === undefined || props.y === undefined) return <g />;
    return (
      <text x={Number(props.x) + 6} y={Number(props.y)} dy={4} fill={INK.primary} fontSize={11} fontFamily="JetBrains Mono, monospace">
        {formatValue(Number(props.value))}{suffix}
      </text>
    );
  };

  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 mb-2" aria-label="Legend">
        {series.map(s => (
          <li key={s.key} className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined} /></svg>
            {s.label}
          </li>
        ))}
        {band && <li className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-700/70" aria-hidden="true" />{band.label}</li>}
      </ul>
      <div className="text-[11px] text-slate-500 mb-1">{axisTitle ?? (unit === '%' ? '% change compared with a year before' : unit)}</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 48, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="period" ticks={januaries.filter((_, i) => i % step === 0)} tickFormatter={(p: string) => p.slice(0, 4)} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: INK.axis }} />
          <YAxis domain={['auto', 'auto']} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${formatValue(v)}${suffix}`} />
          {band && <ReferenceLine y={band.from} stroke={INK.axis} strokeDasharray="2 3" />}
          {band && <ReferenceLine y={band.to} stroke={INK.axis} strokeDasharray="2 3" />}
          {zeroLine && <ReferenceLine y={0} stroke={INK.axis} />}
          {series.map(s => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="linear"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              dot={false}
              connectNulls
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2 }}
              label={endLabel(s)}
            />
          ))}
          <Tooltip content={renderTooltip} cursor={{ stroke: INK.muted }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
