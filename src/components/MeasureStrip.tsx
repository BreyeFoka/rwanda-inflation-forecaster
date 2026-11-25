import React from 'react';
import { Breakdown } from '../lib/api';

/** Latest year-on-year rate for each inflation measure, with the rate a year earlier for scale. */
export const MeasureStrip: React.FC<{ measures: Breakdown[] }> = ({ measures }) => (
  <div className={`grid gap-x-4 gap-y-3 ${measures.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'}`}>
    {measures.map(b => (
      <div key={b.series_id} title={b.note}>
        <div className="text-xs text-slate-400">{b.label}</div>
        <div className="text-lg font-bold font-mono text-white">{b.yoy.toFixed(1)}%</div>
        <div className="text-[11px] text-slate-500">was {b.yoy_12m_ago.toFixed(1)}% a year ago</div>
      </div>
    ))}
  </div>
);

export const measureNote = (measures: Breakdown[], format: (p: string) => string) => {
  const cpi = measures.find(b => b.series_id.startsWith('cpi.'));
  const ppi = measures.find(b => b.series_id === 'ppi.all');
  return `How much prices rose compared with a year before, ${cpi ? format(cpi.period) : ''}${ppi && cpi && ppi.period !== cpi.period ? ` (factory prices: ${format(ppi.period)})` : ''}. Source: National Institute of Statistics of Rwanda. Hover over a figure to see what it covers.`;
};
