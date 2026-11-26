import React, { useState } from 'react';
import { Loader2, Send, Sparkles } from '../components/icons';
import { Card, PageHeader } from '../components/ui';
import { ApiError, postJson } from '../lib/api';
import { formatPeriod } from '../lib/theme';

interface Answer {
  answer: string;
  /** summary: written by the server; ai: written by the model and number-checked; facts: the model's picks shown as they are; none: no matching data */
  mode: 'summary' | 'ai' | 'facts' | 'none';
  model: string | null;
  data_asof: string;
}

const answerNote = (r: Answer) => {
  const asof = formatPeriod(r.data_asof);
  if (r.mode === 'summary') return `Summary of our data up to ${asof}.`;
  if (r.mode === 'ai') return `Written by AI from our data up to ${asof}. Every number in it was checked against the data.`;
  if (r.mode === 'facts') return `The facts from our data (up to ${asof}) that answer your question.`;
  return `Based on our data up to ${asof}.`;
};

const SUGGESTIONS = [
  'Which spending categories are pushing inflation up the most?',
  'How reliable is the twelve-month inflation forecast?',
  'Are prices rising faster in villages than in towns?'
];

export const Analyst: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    setLoading(true);
    setError(null);
    setAsked(q);
    try {
      setResult(await postJson<Answer>('/analyst', { question: q }));
    } catch (e) {
      setResult(null);
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="AI analyst" description="Ask a question in plain words. The AI answers using only our data, and every number it writes is checked against that data before you see it. If we don't have data on your question, it says so." />

      <Card title="Ask about the data">
        <form onSubmit={e => { e.preventDefault(); if (question.trim()) ask(question.trim()); }} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="analyst-question" className="sr-only">Your question</label>
          <input
            id="analyst-question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={1000}
            placeholder="For example: why is transport inflation so high?"
            className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" disabled={loading || !question.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4" />Ask
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => ask('')} disabled={loading} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
            <Sparkles className="w-3.5 h-3.5" />Give me a quick summary
          </button>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setQuestion(s); ask(s); }} disabled={loading} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-xs text-slate-300 text-left disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      </Card>

      {loading && <div role="status" className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />Finding the relevant facts…</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-100">{error}</div>}
      {result && !loading && (
        <Card title={asked || 'Quick summary'} note={answerNote(result)}>
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{result.answer}</div>
        </Card>
      )}
    </div>
  );
};
