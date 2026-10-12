import React, { useState } from 'react';
import { ForecastReport, MacroData } from '../types';
import { X, Copy, Check, Download, FileText, Code, CheckCircle, ShieldCheck, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: ForecastReport;
  macroData: MacroData;
  source: string;
}

export const PolicyBriefModal: React.FC<Props> = ({
  isOpen,
  onClose,
  report,
  macroData,
  source
}) => {
  const [activeTab, setActiveTab] = useState<'brief' | 'json'>('brief');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyJson = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = JSON.stringify(report, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy fallback error:", err);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn("Print error inside iframe environment:", err);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `rwanda-cpi-forecast-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadMarkdown = () => {
    const md = `# Rwanda Macroeconomic & Inflation Policy Brief
**Horizon:** ${report.forecast_summary.target_horizon}
**Projected Direction:** ${report.forecast_summary.projected_cpi_direction}
**Risk Level:** ${report.forecast_summary.overall_risk_level}
**Current Headline CPI:** ${macroData.clusterA_officialDomestic.nisr.headlineCPI}% (BNR Target Corridor: 2.0% - 8.0%)
**Date:** ${macroData.metadata.lastUpdated}
**Source Engine:** ${source}

---

## 1. Top Inflation Drivers & Feature Attribution
${report.top_inflation_drivers.map((d, i) => `### ${i + 1}. ${d.category}
- **Indicator:** ${d.indicator}
- **Predicted CPI Impact:** ${d.predicted_impact}
- **Transmission Lead Time:** ${d.lead_time}
`).join('\n')}

---

## 2. Structural Transmission Breakdown
- **Urban CPI Impact:** ${report.structural_breakdown.urban_cpi_impact}
- **Rural CPI Impact:** ${report.structural_breakdown.rural_cpi_impact}
- **Imported vs Local Ratio:** ${report.structural_breakdown.imported_vs_local}

---

## 3. Policy & Mitigation Directives (BNR / MINAGRI / RURA)
${report.policy_and_mitigation_recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `rwanda-policy-brief-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadDataset = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(macroData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `rwanda-macro-indicators-4clusters.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Official Macroeconomic Policy & Inflation Brief
              </h2>
              <p className="text-xs text-slate-400">
                National Bank of Rwanda (BNR) & NISR Surveillance Alignment • {macroData.metadata.lastUpdated}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('brief')}
                className={`px-3 py-1 rounded font-medium ${
                  activeTab === 'brief' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Document Brief
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1 ${
                  activeTab === 'json' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Raw JSON Schema
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'brief' ? (
            <div className="space-y-6 text-slate-200">
              {/* Executive Header Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest font-mono">Status & Outlook</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    Target Horizon: <span className="text-emerald-400">{report.forecast_summary.target_horizon}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Projected CPI Direction: <strong className="text-slate-200">{report.forecast_summary.projected_cpi_direction}</strong> •
                    System Risk: <strong className="text-amber-400">{report.forecast_summary.overall_risk_level}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Current Headline CPI</div>
                    <div className="text-xl font-mono font-extrabold text-emerald-400">
                      {macroData.clusterA_officialDomestic.nisr.headlineCPI}%
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-800 mx-2"></div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">BNR Target Band</div>
                    <div className="text-sm font-mono font-semibold text-slate-300">
                      2.0% – 8.0% (5.0%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Top Inflation Drivers */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  1. Leading Inflation Pressure Points & Attribution
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {report.top_inflation_drivers.map((d, i) => (
                    <div key={i} className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-emerald-300">#{i + 1} {d.category}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            Lag: {d.lead_time}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            Impact: {d.predicted_impact}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{d.indicator}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Structural Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  2. Structural CPI Transmission Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-sky-400 font-bold block mb-1">Urban CPI Dynamics</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {report.structural_breakdown.urban_cpi_impact}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-amber-400 font-bold block mb-1">Rural CPI Dynamics</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {report.structural_breakdown.rural_cpi_impact}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Imported vs. Local Cost Transmission Ratio</span>
                  <p className="text-slate-200 text-[11px] font-mono leading-relaxed">
                    {report.structural_breakdown.imported_vs_local}
                  </p>
                </div>
              </div>

              {/* Section 3: Policy Recommendations */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  3. Monetary Policy & Inter-Agency Mitigation Directives
                </h3>
                <div className="space-y-2">
                  {report.policy_and_mitigation_recommendations.map((rec, i) => (
                    <div key={i} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs flex gap-2.5 items-start">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-slate-200 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Exact JSON Schema compliant with system specification</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied to Clipboard' : 'Copy JSON'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-mono text-[11px]">
            Model Source: <span className="text-slate-300">{source}</span> • BNR Monetary Policy Cycle
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadDataset}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-1.5 text-xs border border-slate-700/60"
              title="Download 4-Cluster Indicators JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Download Dataset
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-1.5 text-xs border border-slate-700/60"
              title="Download Policy Brief as Markdown document"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Download .MD Brief
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-1.5 text-xs border border-slate-700/60"
              title="Download Forecast Output JSON file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Download JSON
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Schema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
