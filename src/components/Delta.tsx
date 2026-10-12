import React from 'react';
import { ArrowDown, ArrowUp, Minus } from './icons';
import { signed } from '../lib/theme';

/** A change figure: the arrow carries direction and colour, the number stays in text ink. */
export const Delta: React.FC<{ value: number | null; unit: string; upIsBad?: boolean }> = ({ value, unit, upIsBad = true }) => {
  if (value === null) return <span className="text-slate-500">n/a</span>;
  const flat = Math.abs(value) < 0.05;
  const bad = value > 0 === upIsBad;
  const Icon = flat ? Minus : value > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center justify-end gap-1 font-mono text-slate-200">
      <Icon className={`w-3 h-3 ${flat ? 'text-slate-500' : bad ? 'text-rose-400' : 'text-emerald-400'}`} strokeWidth={2.4} />
      {signed(value, unit)}
    </span>
  );
};
