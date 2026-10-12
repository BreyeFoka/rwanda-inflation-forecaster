import React from 'react';
import { SimulationAdjustments, EconometricResult } from '../types';
import { Sliders, RefreshCw, Zap, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';

interface Props {
  adjustments: SimulationAdjustments;
  onChange: (adjustments: SimulationAdjustments) => void;
  econometrics: EconometricResult;
  onRunAiPrediction: () => void;
  isLoadingAi: boolean;
}

export const TimeLagSimulator: React.FC<Props> = ({
  adjustments,
  onChange,
  econometrics,
  onRunAiPrediction,
  isLoadingAi
}) => {
  const updateField = (field: keyof SimulationAdjustments, val: number) => {
    onChange({
      ...adjustments,
      [field]: val
    });
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'drought':
        onChange({
          usdRwfChangePct: 2.0,
          rainfallAnomalyPct: -25,
          brentCrudeChangePct: 0,
          cbrRateChangeBps: 0
        });
        break;
      case 'oil_spike':
        onChange({
          usdRwfChangePct: 4.0,
          rainfallAnomalyPct: 0,
          brentCrudeChangePct: 25,
          cbrRateChangeBps: 0
        });
        break;
      case 'fx_depreciation':
        onChange({
          usdRwfChangePct: 15,
          rainfallAnomalyPct: 0,
          brentCrudeChangePct: 5,
          cbrRateChangeBps: 0
        });
        break;
      case 'combined_shock':
        onChange({
          usdRwfChangePct: 12,
          rainfallAnomalyPct: -20,
          brentCrudeChangePct: 20,
          cbrRateChangeBps: 50
        });
        break;
      case 'favorable_harvest':
        onChange({
          usdRwfChangePct: 0,
          rainfallAnomalyPct: +15,
          brentCrudeChangePct: -10,
          cbrRateChangeBps: -25
        });
        break;
      case 'reset':
      default:
        onChange({
          usdRwfChangePct: 0,
          rainfallAnomalyPct: 0,
          brentCrudeChangePct: 0,
          cbrRateChangeBps: 0
        });
        break;
    }
  };

  const { baseline, projected, factors } = econometrics;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Leading Indicator Time-Lag Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Econometric transmission delay model calibrated to Rwanda's trade & agrarian structure
            </p>
          </div>
        </div>

        {/* Preset chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('reset')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Baseline
          </button>
          <button
            onClick={() => applyPreset('drought')}
            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
          >
            Eastern Drought (-25%)
          </button>
          <button
            onClick={() => applyPreset('oil_spike')}
            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
          >
            Global Brent Shock (+25%)
          </button>
          <button
            onClick={() => applyPreset('fx_depreciation')}
            className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
          >
            USD/RWF +15%
          </button>
          <button
            onClick={() => applyPreset('combined_shock')}
            className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-colors font-medium"
          >
            Combined Crisis
          </button>
        </div>
      </div>

      {/* Simulator Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-5">
        {/* 1. Rainfall / Meteo anomaly (60–90d lag) */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Rainfall / Meteo Anomaly
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-400 font-bold border border-slate-800">
              {adjustments.rainfallAnomalyPct > 0 ? `+${adjustments.rainfallAnomalyPct}%` : `${adjustments.rainfallAnomalyPct}%`}
            </span>
          </div>

          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={adjustments.rainfallAnomalyPct}
            onChange={(e) => updateField('rainfallAnomalyPct', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer"
          />

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span className="text-rose-400">Severe Drought (-50%)</span>
            <span className="font-mono text-slate-400">Time-Lag: <strong>60–90 days</strong> (Fresh Food)</span>
            <span className="text-emerald-400">Surplus (+50%)</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-1.5 flex justify-between">
            <span>Projected CPI Contribution:</span>
            <span className={`font-mono font-bold ${factors.climateRainfall.impact >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {factors.climateRainfall.impact >= 0 ? `+${factors.climateRainfall.impact}%` : `${factors.climateRainfall.impact}%`}
            </span>
          </div>
        </div>

        {/* 2. Exchange Rate USD/RWF (30–60d lag) */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              USD/RWF Exchange Rate Shock
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-slate-900 text-purple-400 font-bold border border-slate-800">
              {adjustments.usdRwfChangePct > 0 ? `+${adjustments.usdRwfChangePct}%` : `${adjustments.usdRwfChangePct}%`}
            </span>
          </div>

          <input
            type="range"
            min="-10"
            max="30"
            step="1"
            value={adjustments.usdRwfChangePct}
            onChange={(e) => updateField('usdRwfChangePct', parseInt(e.target.value, 10))}
            className="w-full accent-purple-500 cursor-pointer"
          />

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>Appreciation (-10%)</span>
            <span className="font-mono text-slate-400">Time-Lag: <strong>30–60 days</strong> (Import Goods)</span>
            <span className="text-rose-400">Depreciation (+30%)</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-1.5 flex justify-between">
            <span>Projected CPI Contribution:</span>
            <span className={`font-mono font-bold ${factors.exchangeRate.impact >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {factors.exchangeRate.impact >= 0 ? `+${factors.exchangeRate.impact}%` : `${factors.exchangeRate.impact}%`}
            </span>
          </div>
        </div>

        {/* 3. Global Brent Crude (15–30d lag) */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Global Brent Crude Price Shock
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-bold border border-slate-800">
              {adjustments.brentCrudeChangePct > 0 ? `+${adjustments.brentCrudeChangePct}%` : `${adjustments.brentCrudeChangePct}%`}
            </span>
          </div>

          <input
            type="range"
            min="-30"
            max="50"
            step="5"
            value={adjustments.brentCrudeChangePct}
            onChange={(e) => updateField('brentCrudeChangePct', parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer"
          />

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>Decline (-30%)</span>
            <span className="font-mono text-slate-400">Time-Lag: <strong>15–30 days</strong> (Transport/PPI)</span>
            <span className="text-rose-400">Spike (+50%)</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-1.5 flex justify-between">
            <span>Projected CPI Contribution:</span>
            <span className={`font-mono font-bold ${factors.fuelEnergy.impact >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {factors.fuelEnergy.impact >= 0 ? `+${factors.fuelEnergy.impact}%` : `${factors.fuelEnergy.impact}%`}
            </span>
          </div>
        </div>

        {/* 4. Central Bank Rate (CBR) Policy Move (90–180d lag) */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              BNR Policy Rate (CBR) Adjustment
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-slate-900 text-sky-400 font-bold border border-slate-800">
              {adjustments.cbrRateChangeBps > 0 ? `+${adjustments.cbrRateChangeBps} bps` : `${adjustments.cbrRateChangeBps} bps`}
            </span>
          </div>

          <input
            type="range"
            min="-100"
            max="150"
            step="25"
            value={adjustments.cbrRateChangeBps}
            onChange={(e) => updateField('cbrRateChangeBps', parseInt(e.target.value, 10))}
            className="w-full accent-sky-500 cursor-pointer"
          />

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>Cut (-100 bps)</span>
            <span className="font-mono text-slate-400">Time-Lag: <strong>90–180 days</strong> (Credit/Demand)</span>
            <span>Hike (+150 bps)</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-1.5 flex justify-between">
            <span>Projected Monetary Policy Dampening:</span>
            <span className={`font-mono font-bold ${factors.monetaryPolicy.impact >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {factors.monetaryPolicy.impact >= 0 ? `+${factors.monetaryPolicy.impact}%` : `${factors.monetaryPolicy.impact}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Simulated Outcomes Bar */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-xs text-slate-400 block">Baseline Headline</span>
            <span className="text-lg font-mono font-bold text-slate-300">{baseline.headline}%</span>
          </div>

          <div className="text-slate-600 hidden sm:block">➔</div>

          <div>
            <span className="text-xs text-slate-400 block">Simulated Projected CPI</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-mono font-extrabold ${
                projected.headline > 8.0 ? 'text-red-400' :
                projected.headline > 6.5 ? 'text-amber-400' :
                projected.headline < 2.0 ? 'text-blue-400' : 'text-emerald-400'
              }`}>
                {projected.headline}%
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                {econometrics.netHeadlineImpact >= 0 ? `+${econometrics.netHeadlineImpact}%` : `${econometrics.netHeadlineImpact}%`}
              </span>
            </div>
          </div>

          <div className="border-l border-slate-800 pl-4 hidden md:block">
            <span className="text-xs text-slate-400 block">Urban vs. Rural Spread</span>
            <div className="font-mono text-xs mt-0.5 space-x-3">
              <span className="text-sky-400">Urban: <strong>{projected.urban}%</strong></span>
              <span className="text-amber-400">Rural: <strong>{projected.rural}%</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={onRunAiPrediction}
          disabled={isLoadingAi}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          {isLoadingAi ? 'Evaluating via Gemini 3.8...' : 'Generate Full AI Forecast Report'}
        </button>
      </div>
    </div>
  );
};
