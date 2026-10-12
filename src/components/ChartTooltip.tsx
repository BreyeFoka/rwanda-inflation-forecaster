import React from 'react';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Tooltip body shared by every chart: a title and rows of swatch, label, value. */
export const ChartTooltip: React.FC<{ title: string; rows: TooltipRow[] }> = ({ title, rows }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 shadow-xl text-xs">
    <div className="font-semibold text-slate-100 mb-1">{title}</div>
    {rows.map(row => (
      <div key={row.label} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-400">
          {row.color && <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />}
          {row.label}
        </span>
        <span className="font-mono text-slate-100">{row.value}</span>
      </div>
    ))}
  </div>
);
