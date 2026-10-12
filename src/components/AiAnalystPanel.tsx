import React, { useState } from 'react';
import { Bot, Send, Sparkles, HelpCircle, Loader2, ArrowRight, Copy, Check, RotateCcw } from 'lucide-react';
import { MacroData } from '../types';

interface Props {
  currentData: MacroData;
}

export const AiAnalystPanel: React.FC<Props> = ({ currentData }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; text: string; source?: string }>>([
    {
      role: 'assistant',
      text: `### Muraho! Rwanda Macroeconomic Intelligence Engine

I provide real-time economic surveillance and policy-grade forecasts grounded in:
* **NISR Consumer Price Indices** (Urban 4.8% vs. Rural 5.4% basket dynamics)
* **National Bank of Rwanda (BNR)** monetary policy corridor (**2.0% – 8.0%**, 5.0% medium-term target, CBR at **6.50%**)
* **MINAGRI** agricultural harvests (Season A vegetative progress & market staple prices)
* **Cross-border EAC logistics** & global commodities (Brent crude, Central/Northern corridors)

Click any of the quick queries above or ask your own question regarding inflation drivers, policy rate recommendations, or climate risks.`
    }
  ]);

  const QUICK_QUESTIONS = [
    "Why is Rural CPI (5.4%) running higher than Urban CPI (4.8%)?",
    "How does a 10% USD/RWF depreciation transmit over 30-60 days?",
    "If Eastern Province rainfall drops by 20%, what is the Season A food impact?",
    "Should BNR adjust the Central Bank Rate (CBR) from 6.50%?"
  ];

  const handleCopyMessage = async (text: string, idx: number) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleResetChat = () => {
    setConversation([
      {
        role: 'assistant',
        text: `### Rwanda Macroeconomic Intelligence Engine Reset

Ready for economic inquiries. Grounded in BNR monetary targets, NISR CPI baskets, and EAC trade corridors.`
      }
    ]);
  };

  const handleSend = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || loading) return;

    const userMsg = q.trim();
    setConversation(prev => [...prev, { role: 'user', text: userMsg }]);
    if (!queryText) setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/ask-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          currentIndicators: currentData,
          conversationHistory: conversation
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.answer) {
        setConversation(prev => [...prev, { role: 'assistant', text: data.answer, source: data.source || 'gemini-3.8-flash' }]);
      } else {
        setConversation(prev => [...prev, {
          role: 'assistant',
          text: "I was unable to process the economic inquiry at this time. Please try again."
        }]);
      }
    } catch (err: any) {
      setConversation(prev => [...prev, {
        role: 'assistant',
        text: `**Surveillance Notice**: Failed to connect to intelligence engine (${err.message || 'Network error'}). Please verify connectivity and retry.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render markdown and handle raw JSON gracefully
  const renderFormattedText = (rawText: string) => {
    // If it looks like raw JSON, parse and present cleanly
    if (rawText.trim().startsWith('{') && rawText.trim().endsWith('}')) {
      try {
        const obj = JSON.parse(rawText.trim());
        return (
          <div className="space-y-3">
            {obj.forecast_summary && (
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold block mb-1">
                  Forecast Summary
                </span>
                <div className="flex gap-4 text-xs font-mono">
                  <span>Horizon: <strong>{obj.forecast_summary.target_horizon}</strong></span>
                  <span>Direction: <strong>{obj.forecast_summary.projected_cpi_direction}</strong></span>
                  <span>Risk: <strong>{obj.forecast_summary.overall_risk_level}</strong></span>
                </div>
              </div>
            )}
            {obj.top_inflation_drivers && Array.isArray(obj.top_inflation_drivers) && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
                  Top Drivers:
                </span>
                {obj.top_inflation_drivers.map((d: any, i: number) => (
                  <div key={i} className="text-xs p-2 rounded bg-slate-900/60 border border-slate-800/60">
                    <span className="font-semibold text-emerald-300">#{i + 1} {d.category}</span>: {d.indicator}
                    <span className="font-mono text-emerald-400 ml-2">({d.predicted_impact}, Lag: {d.lead_time})</span>
                  </div>
                ))}
              </div>
            )}
            {obj.structural_breakdown && (
              <div className="text-xs space-y-1 text-slate-300">
                {obj.structural_breakdown.urban_cpi_impact && <p>• <strong>Urban:</strong> {obj.structural_breakdown.urban_cpi_impact}</p>}
                {obj.structural_breakdown.rural_cpi_impact && <p>• <strong>Rural:</strong> {obj.structural_breakdown.rural_cpi_impact}</p>}
              </div>
            )}
            {obj.policy_and_mitigation_recommendations && Array.isArray(obj.policy_and_mitigation_recommendations) && (
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block">Policy Directives:</span>
                {obj.policy_and_mitigation_recommendations.map((rec: string, i: number) => (
                  <p key={i} className="text-slate-300">• {rec}</p>
                ))}
              </div>
            )}
          </div>
        );
      } catch {
        // Fall back to standard rendering
      }
    }

    // Markdown-like line-by-line renderer
    const lines = rawText.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIdx} className="h-1" />;
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={lineIdx} className="text-sm font-bold text-emerald-400 pt-1 border-b border-slate-800/80 pb-1">
                {trimmed.replace(/^###\s+/, '')}
              </h4>
            );
          }

          if (trimmed.startsWith('#### ')) {
            return (
              <h5 key={lineIdx} className="text-xs font-bold text-sky-300 pt-1">
                {trimmed.replace(/^####\s+/, '')}
              </h5>
            );
          }

          if (trimmed === '---') {
            return <hr key={lineIdx} className="border-slate-800 my-2" />;
          }

          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const content = trimmed.substring(2);
            return (
              <div key={lineIdx} className="flex gap-2 text-xs pl-1">
                <span className="text-emerald-400 font-bold shrink-0">•</span>
                <span className="text-slate-200 leading-relaxed">
                  {renderInlineFormatting(content)}
                </span>
              </div>
            );
          }

          if (/^\d+\.\s+/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\.\s+/)?.[1];
            const content = trimmed.replace(/^\d+\.\s+/, '');
            return (
              <div key={lineIdx} className="flex gap-2 text-xs pl-1">
                <span className="text-sky-400 font-mono font-bold shrink-0">{num}.</span>
                <span className="text-slate-200 leading-relaxed">
                  {renderInlineFormatting(content)}
                </span>
              </div>
            );
          }

          return (
            <p key={lineIdx} className="text-xs text-slate-200 leading-relaxed">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineFormatting = (text: string) => {
    // Process **bold** highlights
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm flex flex-col h-[580px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              AI Macroeconomic Policy Analyst
            </h3>
            <p className="text-xs text-slate-400">
              Interactive inquiries grounded in Rwanda's BNR policy corridor and NISR baskets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini 3.8 Flash Online
          </div>

          <button
            onClick={handleResetChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Reset Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-slate-800/80">
        <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
          <HelpCircle className="w-3 h-3" /> Quick queries:
        </span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded bg-slate-950/70 hover:bg-slate-800 hover:border-emerald-500/40 text-slate-300 border border-slate-800/80 transition-colors flex items-center gap-1.5 text-left disabled:opacity-50"
          >
            <span>{q}</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl p-3.5 shadow-md relative group ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-slate-950 font-medium ml-4'
                  : 'bg-slate-950/90 border border-slate-800 text-slate-200 mr-4'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono uppercase font-semibold">
                    <Bot className="w-3 h-3" /> Intelligence Engine Response
                  </div>

                  <button
                    onClick={() => handleCopyMessage(msg.text, idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    title="Copy response"
                  >
                    {copiedIdx === idx ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="text-slate-950 font-semibold">{msg.text}</div>
              ) : (
                renderFormattedText(msg.text)
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-slate-300 flex items-center gap-3 text-xs shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
              <span>Synthesizing econometric transmission lags & BNR corridors with Gemini 3.8 Flash...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-slate-800 flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about Rwanda CPI drivers, BNR policy rates, EAC transit tariffs, or crop yields..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-md cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};

