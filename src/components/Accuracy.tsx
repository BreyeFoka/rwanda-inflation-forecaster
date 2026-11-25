import React, { useState } from 'react';
import { Backtest } from '../lib/api';
import { BAND, formatPeriod } from '../lib/theme';
import { Segmented } from './ui';

const METHOD_LABELS: Record<string, string> = {
  persistence: 'Simple guess: prices keep rising at today\'s rate',
  sarima: 'Statistical model (seasonal ARIMA)',
  timesfm: "Google's AI model (TimesFM)",
  timesfm_covariates: "Google's AI model, plus exchange rate, oil, food and rain",
  ensemble: 'Average of the AI and statistical models'
};

// Methods that need Google's TimesFM model; their rows can come from an earlier run.
const CARRIED = ['timesfm', 'timesfm_covariates', 'ensemble'];

const horizonLabel = (h: number) => (h === 1 ? 'Next month' : h === 12 ? 'A year ahead' : `${h} months ahead`);

export const Accuracy: React.FC<{ backtest: Backtest; shown: string }> = ({ backtest, shown }) => {
  const [horizon, setHorizon] = useState(backtest.horizons[0]);
  const ours = backtest.mae_pp[shown];
  const coverage = backtest.interval80_coverage_pct[shown];
  const methods = Object.entries(backtest.mae_pp).sort((a, b) => a[1][String(horizon)] - b[1][String(horizon)]);
  const worst = Math.max(...methods.map(([, row]) => row[String(horizon)]));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-300 mb-3">On average, our forecast was off by about this many points:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {backtest.horizons.map(h => (
            <div key={h} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-400">{horizonLabel(h)}</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">±{ours[String(h)].toFixed(1)}</div>
              {coverage?.[String(h)] !== undefined && (
                <div className="text-xs text-slate-400 mt-1">Inside our range {coverage[String(h)]}% of the time</div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          For example, ±{ours[String(backtest.horizons[0])].toFixed(1)} next month means that when we said 10%, the real figure usually ended up
          between {(10 - ours[String(backtest.horizons[0])]).toFixed(1)}% and {(10 + ours[String(backtest.horizons[0])]).toFixed(1)}%.
          The further ahead we look, the bigger the miss, which is why the range gets wider each month. We aim for the real figure to land inside the range 8 times out of 10.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-medium text-white">Compared with other methods</h3>
          <Segmented label="How far ahead" value={horizon} onChange={setHorizon} options={backtest.horizons.map(h => ({ value: h, label: h === 1 ? '1 month' : `${h} months` }))} />
        </div>
        <ul className="space-y-2.5">
          {methods.map(([name, row]) => {
            const v = row[String(horizon)];
            const isOurs = name === shown;
            return (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={isOurs ? 'text-white font-semibold' : 'text-slate-300'}>
                    {METHOD_LABELS[name] || name}
                    {backtest.timesfm_asof && CARRIED.includes(name) && <span className="text-slate-500"> *</span>}
                    {isOurs && <span className="ml-2 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 rounded px-1.5 py-0.5">used on this site</span>}
                  </span>
                  <span className="font-mono text-slate-200">±{v.toFixed(1)}</span>
                </div>
                <div className="h-2 mt-1 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full" style={{ width: `${(v / worst) * 100}%`, background: isOurs ? BAND : '#475569' }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-500 mt-3">Shorter bar = smaller miss = better.</p>
        {backtest.timesfm_asof && (
          <p className="text-xs text-slate-500 mt-1">
            * From our last full test, on data up to {formatPeriod(backtest.timesfm_asof)}, because Google's model could not be re-run this time.
          </p>
        )}
      </div>
    </div>
  );
};
