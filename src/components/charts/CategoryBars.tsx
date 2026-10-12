import React from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { INK, SERIES, signed } from '../../lib/theme';
import { Overview } from '../../lib/api';

type Component = Overview['components'][number];

const CategoryTooltip: React.FC<{ active?: boolean; payload?: { payload: Component }[] }> = ({ active, payload }) => {
  const c = active ? payload?.[0]?.payload : undefined;
  if (!c) return null;
  return (
    <ChartTooltip
      title={c.name}
      rows={[
        { label: 'Now', value: `${c.yoy.toFixed(1)}% y/y`, color: SERIES.actual },
        { label: 'Three months ago', value: `${c.yoy_3m_ago.toFixed(1)}% y/y` },
        { label: 'Change', value: signed(c.yoy - c.yoy_3m_ago, ' pp') }
      ]}
    />
  );
};

/** Year-on-year price change for each CPI category, largest first. */
export const CategoryBars: React.FC<{ components: Component[] }> = ({ components }) => (
  <ResponsiveContainer width="100%" height={components.length * 28 + 8}>
    <BarChart data={components} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={8}>
      <XAxis type="number" hide domain={[(min: number) => Math.min(0, min), 'dataMax']} />
      <YAxis
        type="category"
        dataKey="name"
        width={250}
        tickLine={false}
        axisLine={false}
        tick={{ fill: INK.primary, fontSize: 12, width: 250 }}
        tickFormatter={(name: string) => (name.length > 36 ? `${name.slice(0, 35)}…` : name)}
      />
      <Tooltip content={<CategoryTooltip />} cursor={{ fill: INK.grid }} />
      <Bar dataKey="yoy" fill={SERIES.actual} radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false}>
        <LabelList dataKey="yoy" position="right" formatter={v => `${Number(v).toFixed(1)}%`} fill={INK.primary} fontSize={11} fontFamily="JetBrains Mono, monospace" />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
