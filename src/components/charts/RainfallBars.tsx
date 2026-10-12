import React from 'react';
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { DIVERGING, INK, formatPeriod, signed } from '../../lib/theme';
import { Overview } from '../../lib/api';

type Rain = Overview['rainfall'][number];

const RainTooltip: React.FC<{ active?: boolean; payload?: { payload: Rain }[] }> = ({ active, payload }) => {
  const r = active ? payload?.[0]?.payload : undefined;
  if (!r) return null;
  return (
    <ChartTooltip
      title={r.name}
      rows={[
        { label: 'Last three months vs normal', value: signed(r.anomaly_3m_pct, '%', 0) },
        { label: `${formatPeriod(r.period)} vs normal`, value: signed(r.anomaly_pct, '%', 0) },
        { label: `${formatPeriod(r.period)} rainfall`, value: `${r.rain_mm} mm` }
      ]}
    />
  );
};

/** Three-month rainfall against the 1991-2020 normal: wetter to the right, drier to the left. */
export const RainfallBars: React.FC<{ rainfall: Rain[] }> = ({ rainfall }) => {
  const extent = Math.max(40, ...rainfall.map(r => Math.abs(r.anomaly_3m_pct))) * 1.35;
  return (
    <div>
      <ResponsiveContainer width="100%" height={rainfall.length * 34 + 8}>
        <BarChart data={rainfall} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[-extent, extent]} />
          <YAxis type="category" dataKey="name" width={230} tickLine={false} axisLine={false} tick={{ fill: INK.primary, fontSize: 12, width: 230 }} />
          <Tooltip content={<RainTooltip />} cursor={{ fill: INK.grid }} />
          <ReferenceLine x={0} stroke={INK.axis} />
          <Bar dataKey="anomaly_3m_pct" barSize={10} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rainfall.map(r => <Cell key={r.series_id} fill={r.anomaly_3m_pct >= 0 ? DIVERGING.above : DIVERGING.below} />)}
            <LabelList dataKey="anomaly_3m_pct" position="right" formatter={v => signed(Number(v), '%', 0)} fill={INK.primary} fontSize={11} fontFamily="JetBrains Mono, monospace" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 text-[11px] text-slate-400 mt-2">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: DIVERGING.above }} />Wetter than normal</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: DIVERGING.below }} />Drier than normal</span>
      </div>
    </div>
  );
};
