import React from 'react';
import { TopInflationDriver, ForecastSummary, StructuralBreakdown } from '../types';
import { Sprout, Globe, Zap, DollarSign, Clock, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, ShieldAlert } from 'lucide-react';

interface Props {
  forecastSummary: ForecastSummary;
  drivers: TopInflationDriver[];
  structural: StructuralBreakdown;
  source?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const DriverAttributionCard: React.FC<Props> = ({
  forecastSummary,
  drivers,
  structural,
  source = 'gemini-3.8-flash',
  onRefresh,
  isLoading = false
}) => {
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('food') || lower.includes('agri') || lower.includes('harvest')) {
      return <Sprout className="w-4 h-4 text-emerald-400" />;
    }
    if (lower.includes('import') || lower.includes('supply') || lower.includes('exchange') || lower.includes('currency')) {
      return <Globe className="w-4 h-4 text-blue-400" />;
    }
    if (lower.includes('energy') || lower.includes('fuel') || lower.includes('utilit') || lower.includes('power')) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    return <DollarSign className="w-4 h-4 text-purple-400" />;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'High':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getDirectionIcon = (dir: string) => {
    if (dir === 'Increasing') return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
    if (dir === 'Decreasing') return <ArrowDownRight className="w-4 h-4 text-emerald-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Predictive Risk Scoring & Top 3 Drivers
              </h3>
              <p className="text-xs text-slate-400">
                Attribution protocol per BNR inflation forecast framework
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getRiskBadge(forecastSummary.overall_risk_level)}`}>
              <AlertCircle className="w-3.5 h-3.5" />
              Risk: {forecastSummary.overall_risk_level}
            </span>
          </div>
        </div>

        {/* Forecast Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Target Horizon</span>
            <span className="text-sm font-semibold text-slate-100 mt-0.5 block">{forecastSummary.target_horizon}</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">CPI Trajectory</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getDirectionIcon(forecastSummary.projected_cpi_direction)}
              <span className="text-sm font-semibold text-slate-100">{forecastSummary.projected_cpi_direction}</span>
            </div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Intelligence Engine</span>
            <span className="text-xs font-mono text-emerald-400 mt-0.5 block truncate">
              {source.includes('gemini') ? 'Gemini 3.8 Flash' : 'Econometric Model'}
            </span>
          </div>
        </div>

        {/* Top 3 Drivers list */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Primary Headline Pressure Points</span>
            <span className="text-[11px] text-slate-500 font-normal">Ranked by Predicted CPI Impact</span>
          </div>

          {drivers.map((driver, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    {getCategoryIcon(driver.category)}
                  </div>
                  <span className="text-xs font-medium text-emerald-300">
                    #{idx + 1} {driver.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Lag: {driver.lead_time}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    driver.predicted_impact.startsWith('-') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                  }`}>
                    {driver.predicted_impact}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 pl-8 leading-relaxed">
                {driver.indicator}
              </p>
            </div>
          ))}
        </div>

        {/* Structural Breakdown: Urban vs Rural & Imported vs Local */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Structural Transmission Breakdown
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800">
              <span className="text-sky-400 font-medium block mb-1">Urban CPI Factor</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {structural.urban_cpi_impact}
              </p>
            </div>

            <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800">
              <span className="text-amber-400 font-medium block mb-1">Rural CPI Factor</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {structural.rural_cpi_impact}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium block mb-1">Imported vs. Local Cost Pressures</span>
            <p className="text-slate-200 text-[11px] leading-relaxed font-mono">
              {structural.imported_vs_local}
            </p>
          </div>
        </div>
      </div>

      {onRefresh && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? 'Synthesizing Signals...' : 'Re-Run Intelligence Cycle'}
          </button>
        </div>
      )}
    </div>
  );
};
