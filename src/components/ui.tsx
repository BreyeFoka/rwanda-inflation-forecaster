import React from 'react';
import { Link } from 'react-router-dom';
import { ApiState } from '../lib/api';
import { AlertTriangle, ArrowRight, Loader2 } from './icons';
import { Sparkline } from './Sparkline';

export const PageHeader: React.FC<{ title: string; description: string; children?: React.ReactNode }> = ({ title, description, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
      <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
    </div>
    {children}
  </div>
);

interface CardProps {
  title: string;
  note?: string;
  /** Route to the page that covers this card's subject in detail. */
  more?: { to: string; label: string };
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, note, more, className = '', children }) => (
  <section className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
      {more && (
        <Link to={more.to} className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1">
          {more.label}<ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </header>
    {children}
  </section>
);

interface StatTileProps {
  label: string;
  value: string;
  detail?: React.ReactNode;
  spark?: number[];
  sparkColor?: string;
  emphasis?: boolean;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, detail, spark, sparkColor, emphasis, className = '' }) => (
  <div className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between gap-3 ${className}`}>
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`font-bold font-mono text-white tracking-tight mt-1 ${emphasis ? 'text-4xl' : 'text-2xl'}`}>{value}</div>
      {detail && <div className="text-xs text-slate-400 mt-1.5">{detail}</div>}
    </div>
    {spark && spark.length > 1 && <Sparkline values={spark} color={sparkColor} height={emphasis ? 44 : 32} />}
  </div>
);

/** Renders children once data is in; otherwise a loading, preparing or error state. */
export function DataState<T>({ state, children, label = 'data' }: { state: ApiState<T>; children: (data: T) => React.ReactNode; label?: string }) {
  if (state.data !== undefined) return <>{children(state.data)}</>;
  if (state.error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-100 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" />{state.error}</span>
        <button onClick={state.reload} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100">Try again</button>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-slate-400 py-6">
      <Loader2 className="w-4 h-4 animate-spin" />
      {state.pending ? `Preparing ${label}. This can take a few minutes the first time.` : `Loading ${label}…`}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${o.value === value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const StaleBadge: React.FC<{ months: number }> = ({ months }) =>
  months > 6 ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400"><AlertTriangle className="w-3 h-3" />{months} months old</span>
  ) : null;
