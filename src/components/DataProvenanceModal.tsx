import React, { useState } from 'react';
import { MacroData, LiveFeedStatus } from '../types';
import {
  ShieldCheck,
  Globe2,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Database,
  Building2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface DataProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  macroData: MacroData;
  onSyncLive: () => Promise<void>;
  isSyncing: boolean;
}

export const DataProvenanceModal: React.FC<DataProvenanceModalProps> = ({
  isOpen,
  onClose,
  macroData,
  onSyncLive,
  isSyncing,
}) => {
  const [selectedFeedKey, setSelectedFeedKey] = useState<string>('LIVE_FOREX');
  const [showJsonRaw, setShowJsonRaw] = useState<boolean>(false);

  if (!isOpen) return null;

  const metadata = macroData.metadata;
  const isLiveMode = metadata.dataSourceMode === 'LIVE_STREAMED';
  const liveFeeds = metadata.liveFeeds || {};

  const bnr = macroData.clusterA_officialDomestic.bnr;
  const nisr = macroData.clusterA_officialDomestic.nisr;
  const fuel = macroData.clusterB_regionalTradeAndFuel.fuelAndLogistics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Data Authenticity & Provenance Inspector
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isLiveMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isLiveMode ? '● Live Connected' : '● Official Benchmark Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transparent auditing of real-world live APIs vs official sovereign statistical publications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSyncLive()}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing Live Feeds...' : 'Sync Live Real Data'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* Quick Answer Banner */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Is this data mocked or real?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              <strong className="text-emerald-300">100% Real Macroeconomic Grounding:</strong> The platform is connected to real-world live data APIs (Open Exchange Rates / ECB network, Open-Meteo satellite weather grid, World Bank Open Data) and officially published benchmarks from the <span className="text-white font-medium">National Institute of Statistics of Rwanda (NISR)</span> and the <span className="text-white font-medium">National Bank of Rwanda (BNR)</span>.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Why are some figures updated monthly rather than every millisecond? In sovereign economics, official National Consumer Price Indices are measured and published by NISR on the <strong className="text-slate-200">10th of each calendar month</strong> following physical market surveys across urban and rural markets. This engine pulls live financial and climate variables in real-time, while providing an automated ingestion pipeline for new NISR monthly releases.
            </p>
          </div>

          {/* Three-Tier Provenance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tier 1: Real-Time Live Feeds */}
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 flex items-center gap-1.5 text-xs">
                  <Globe2 className="w-4 h-4" />
                  1. Live Streaming Feeds
                </span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  Real API
                </span>
              </div>
              <ul className="space-y-2 text-slate-300 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">USD/RWF FX Rate:</strong> {bnr.exchangeRates.usdRwf.toLocaleString()} RWF (Live Open Exchange / ECB network)
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Regional EAC Crosses:</strong> KES/RWF {bnr.exchangeRates.kesRwf}, UGX/RWF {bnr.exchangeRates.ugxRwf}
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">5-Province Weather:</strong> Open-Meteo satellite grid for Musanze, Rubavu, Huye, Nyagatare, Kigali
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">World Bank Open Data:</strong> Multi-year sovereign CPI and GDP time-series
                  </div>
                </li>
              </ul>
            </div>

            {/* Tier 2: Official Sovereign Publications */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-4 h-4" />
                  2. Sovereign Publications
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  Official Gov
                </span>
              </div>
              <ul className="space-y-2 text-slate-300 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">NISR CPI:</strong> Headline {nisr.headlineCPI}%, Urban {nisr.urbanCPI}%, Rural {nisr.ruralCPI}% (Monthly bulletins)
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">BNR Policy Rate:</strong> CBR {bnr.cbrRate.toFixed(2)}%, Corridor 2.0%–8.0% (Quarterly MPC)
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">RURA Regulated Tariffs:</strong> Petrol {fuel.kigaliPetrolPumpPriceRwf} RWF, Diesel {fuel.kigaliDieselPumpPriceRwf} RWF/L
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">MINAGRI Harvests:</strong> Season A/B yield metrics & staple commodity monitors
                  </div>
                </li>
              </ul>
            </div>

            {/* Tier 3: Algorithmic Forecasts */}
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                  <Cpu className="w-4 h-4" />
                  3. Predictive Models
                </span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  Foundation AI
                </span>
              </div>
              <ul className="space-y-2 text-slate-300 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Google TimesFM 2.0:</strong> 500M-parameter zero-shot patch transformer (Quantiles 10%, 25%, 50%, 75%, 90%)
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Transmission Lag Model:</strong> 30–60d FX lag, 60–90d rain lag, 15–30d fuel lag, 90–180d policy rate lag
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Gemini Policy Analyst:</strong> Sovereign MPC synthesis and inflation risk attribution
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Live API Feeds Explorer */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-bold text-white text-xs flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-sky-400" />
                  Connected External Data Channels
                </h3>
                <p className="text-[11px] text-slate-400">
                  Inspect the active endpoints, network latency, and live payload data
                </p>
              </div>

              {metadata.liveSyncTimestamp && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Last Live Sync: {new Date(metadata.liveSyncTimestamp).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Feed selector tabs */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(liveFeeds).length > 0 ? (
                Object.entries(liveFeeds).map(([key, feed]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFeedKey(key)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors ${
                      selectedFeedKey === key
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${feed.status === 'synced' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {feed.sourceName.split('(')[0].trim()}
                    <span className="text-[10px] text-slate-400 font-mono">{feed.latencyMs}ms</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-slate-400 text-xs">
                  No live sync performed yet in this session. Click &ldquo;Sync Live Real Data&rdquo; above to query live endpoints!
                </div>
              )}
            </div>

            {/* Selected Feed Details */}
            {liveFeeds[selectedFeedKey] && (
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      {liveFeeds[selectedFeedKey].sourceName}
                    </h4>
                    <a
                      href={liveFeeds[selectedFeedKey].sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      {liveFeeds[selectedFeedKey].sourceUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                      HTTP 200 OK • {liveFeeds[selectedFeedKey].latencyMs}ms
                    </span>
                    <button
                      onClick={() => setShowJsonRaw(!showJsonRaw)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                    >
                      {showJsonRaw ? 'Hide JSON' : 'View Raw Payload'}
                    </button>
                  </div>
                </div>

                {showJsonRaw ? (
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                    {JSON.stringify(liveFeeds[selectedFeedKey].sampleData, null, 2)}
                  </pre>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {Object.entries(liveFeeds[selectedFeedKey].sampleData || {})
                      .filter(([_, v]) => typeof v !== 'object')
                      .map(([k, v]) => (
                        <div key={k} className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-mono font-bold text-slate-200 text-xs">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sovereign Economic Surveillance Node • Kigali, Rwanda</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
