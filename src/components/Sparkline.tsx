import React from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { INK } from '../lib/theme';

/** Bare trend line for tiles and table rows; the number beside it carries the value. */
export const Sparkline: React.FC<{ values: number[]; color?: string; height?: number }> = ({ values, color = INK.secondary, height = 32 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={values.map(value => ({ value }))} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
      <YAxis hide domain={['dataMin', 'dataMax']} />
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer>
);
