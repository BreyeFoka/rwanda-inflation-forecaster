import React from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EARLIER, INK } from '../../lib/theme';
import { ChartTooltip } from '../ChartTooltip';

export interface ThenNowRow {
  name: string;
  then: number;
  now: number;
}

interface Props {
  rows: ThenNowRow[];
  thenLabel: string;
  nowLabel: string;
  color: string;
  unit?: string;
}

/** Horizontal paired bars: the earlier value in grey, the current one in colour, current value labelled. */
export const ThenNowBars: React.FC<Props> = ({ rows, thenLabel, nowLabel, color, unit = '%' }) => {
  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: ThenNowRow }[] }) => {
    const r = active ? payload?.[0]?.payload : undefined;
    if (!r) return null;
    return (
      <ChartTooltip
        title={r.name}
        rows={[
          { label: nowLabel, value: `${r.now.toFixed(1)}${unit}`, color },
          { label: thenLabel, value: `${r.then.toFixed(1)}${unit}`, color: EARLIER },
          { label: 'Change', value: `${r.now - r.then > 0 ? '+' : ''}${(r.now - r.then).toFixed(1)} pp` }
        ]}
      />
    );
  };
  return (
    <div>
      <ul className="flex gap-4 text-xs text-slate-300 mb-2" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />{nowLabel}</li>
        <li className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm" style={{ background: EARLIER }} aria-hidden="true" />{thenLabel}</li>
      </ul>
      <ResponsiveContainer width="100%" height={rows.length * 44 + 8}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barGap={2} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={{ fill: INK.primary, fontSize: 12 }} />
          <Tooltip content={renderTooltip} cursor={{ fill: INK.grid }} />
          <Bar dataKey="now" fill={color} radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false}>
            <LabelList dataKey="now" position="right" formatter={v => `${Number(v).toFixed(1)}${unit}`} fill={INK.primary} fontSize={11} fontFamily="JetBrains Mono, monospace" />
          </Bar>
          <Bar dataKey="then" fill={EARLIER} radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false}>
            <LabelList dataKey="then" position="right" formatter={v => `${Number(v).toFixed(1)}`} fill={INK.secondary} fontSize={10} fontFamily="JetBrains Mono, monospace" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
