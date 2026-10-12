import { useCallback, useEffect, useState } from 'react';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');

export interface Indicator {
  series_id: string;
  name: string;
  unit: string;
  group: string;
  source: string;
  period: string;
  value: number;
  change_unit: string;
  change_mom: number | null;
  change_yoy: number | null;
}

export interface Overview {
  inflation: { name: string; period: string; yoy: number; yoy_prev_month: number; mom: number; source: string };
  components: { series_id: string; name: string; period: string; yoy: number; yoy_3m_ago: number }[];
  indicators: Indicator[];
  rainfall: { series_id: string; name: string; period: string; rain_mm: number; anomaly_pct: number; anomaly_3m_pct: number }[];
  sources: [string, string][];
}

export interface Forecast {
  target: string;
  model: string;
  variant: string;
  covariates: string[];
  last_observed: string;
  history: { period: string; yoy: number }[];
  // yoy holds the 10%..90% quantiles; index 4 is the median
  forecast: { period: string; yoy: number[] }[];
}

export interface SeriesForecast {
  series_id: string;
  last_observed: string;
  model: string;
  // values holds the 10%..90% quantiles; index 4 is the median
  forecast: { period: string; values: number[] }[];
}

export interface Backtest {
  first_origin: string;
  last_origin: string;
  horizons: number[];
  n_forecasts: Record<string, number>;
  mae_pp: Record<string, Record<string, number>>;
  interval80_coverage_pct: Record<string, Record<string, number>>;
  best_overall: string;
}

export interface Observation {
  period: string;
  value: number;
}

export type SeriesMap = Record<string, { name: string; unit: string; source: string; observations: Observation[] }>;

export interface CatalogEntry {
  series_id: string;
  name: string;
  unit: string;
  group: string;
  source: string;
  source_url: string;
  fetched_at: string;
  n: number;
  first_period: string;
  last_period: string;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('The data service cannot be reached.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.detail || `The data service returned an error (${res.status}).`, res.status);
  return { status: res.status, body: body as T };
}

export const postJson = <T,>(path: string, payload: unknown = {}) =>
  request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.body);

export interface ApiState<T> {
  data: T | undefined;
  error: string | undefined;
  /** The server is still preparing this result (first data load, or a backtest in progress). */
  pending: boolean;
  reload: () => void;
}

const RETRY_MS = 15000;

/** Fetches a GET endpoint; keeps polling while the server answers "still computing" or "still loading". */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(a => a + 1), []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const retryLater = () => {
      setPending(true);
      timer = setTimeout(() => !cancelled && setAttempt(a => a + 1), RETRY_MS);
    };
    request<T>(path)
      .then(({ status, body }) => {
        if (cancelled) return;
        if (status === 202) return retryLater();
        setData(body);
        setError(undefined);
        setPending(false);
      })
      .catch((e: ApiError) => {
        if (cancelled) return;
        if (e.status === 503) return retryLater();
        setError(e.message);
        setPending(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path, attempt]);

  return { data, error, pending, reload };
}
