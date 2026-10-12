"""Inflation forecasting on the ingested series: Google TimesFM 3.0 plus honest baselines.

The model forecasts the CPI index level; year-on-year inflation is derived from it, so
base effects from past price jumps roll out of the forecast the way they will in the data.

Run:  python model.py        (prints the backtest and the current forecast)
"""
from __future__ import annotations

import json
import sqlite3
import threading
import warnings

import numpy as np
import pandas as pd

from ingest import DATA_DIR, DB_PATH

BACKTEST_CACHE = DATA_DIR / "backtest.json"
TARGET = "cpi.all"
# Drivers offered to the model as past-only covariates.
COVARIATES = ["fx.usd_rwf", "commodity.brent", "commodity.maize", "food.beans", "food.irish_potatoes", "rain_anom.east"]
QUANTILES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
MAX_HORIZON = 12  # beyond 12 months the y/y denominator is itself a forecast
BACKTEST_ORIGINS = 72
BACKTEST_HORIZONS = (1, 3, 6, 12)

_model = None
_model_lock = threading.Lock()
_infer_lock = threading.Lock()  # one inference at a time; requests and the backtest share the CPU


def get_model():
    global _model
    with _model_lock:
        if _model is None:
            import timesfm

            _model = timesfm.TimesFM3Forecaster.from_pretrained()
        return _model


def load_frame() -> pd.DataFrame:
    """All stored series as a month-indexed wide frame."""
    conn = sqlite3.connect(DB_PATH)
    long = pd.read_sql("SELECT series_id, period, value FROM observations", conn)
    conn.close()
    wide = long.pivot(index="period", columns="series_id", values="value")
    wide.index = pd.PeriodIndex(wide.index, freq="M")
    return wide.sort_index()


def yoy(index: pd.Series) -> pd.Series:
    return 100.0 * (index / index.shift(12) - 1.0)


def _covariate_matrix(frame: pd.DataFrame, periods: pd.PeriodIndex) -> np.ndarray | None:
    cols = [c for c in COVARIATES if c in frame.columns]
    if not cols:
        return None
    # Drivers publish with different lags; carry the last known value to the forecast origin.
    block = frame[cols].reindex(periods).ffill().bfill()
    return block.to_numpy(dtype=np.float32).T


def timesfm_quantiles(frame: pd.DataFrame, origins: list[int], horizon: int, use_covariates: bool) -> np.ndarray:
    """Index-level quantile forecasts, shape (len(origins), horizon, 9), one per forecast origin.

    `origins` are positions in the target series of the last observation the model may see.
    """
    target = frame[TARGET].dropna()
    contexts, covs = [], []
    for o in origins:
        window = target.iloc[: o + 1]
        contexts.append(window.to_numpy(dtype=np.float32))
        covs.append(_covariate_matrix(frame, window.index) if use_covariates else None)
    model = get_model()
    with _infer_lock:
        outputs = model.predict_batch(
            contexts, horizon, past_only_covariates=covs if use_covariates else None, return_quantiles=True
        )
        return np.stack([out.quantiles for out in outputs])


def _sarima_path(log_index: np.ndarray, horizon: int) -> np.ndarray:
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = SARIMAX(log_index[-120:], order=(1, 1, 1), seasonal_order=(0, 1, 1, 12)).fit(disp=False, maxiter=50)
    return np.exp(fit.forecast(horizon))


def run_backtest() -> dict:
    """Rolling-origin test: at each past month, forecast ahead using only data known then.

    Errors are in percentage points of y/y inflation.
    """
    frame = load_frame()
    target = frame[TARGET].dropna()
    values = target.to_numpy()
    n = len(values)
    hmax = max(BACKTEST_HORIZONS)
    origins = list(range(n - 1 - BACKTEST_ORIGINS, n - 1))

    paths = {
        "timesfm": timesfm_quantiles(frame, origins, hmax, use_covariates=False),
        "timesfm_covariates": timesfm_quantiles(frame, origins, hmax, use_covariates=True),
    }
    sarima = np.stack([_sarima_path(np.log(values[: o + 1]), hmax) for o in origins])

    errors = {m: {h: [] for h in BACKTEST_HORIZONS} for m in ("persistence", "sarima", *paths, "ensemble")}
    covered = {m: {h: [] for h in BACKTEST_HORIZONS} for m in paths}
    for i, o in enumerate(origins):
        for h in BACKTEST_HORIZONS:
            if o + h >= n:
                continue
            base = values[o + h - 12]
            actual = 100.0 * (values[o + h] / base - 1.0)
            errors["persistence"][h].append(abs(100.0 * (values[o] / values[o - 12] - 1.0) - actual))
            errors["sarima"][h].append(abs(100.0 * (sarima[i, h - 1] / base - 1.0) - actual))
            blend = (sarima[i, h - 1] + paths["timesfm"][i, h - 1, 4]) / 2.0
            errors["ensemble"][h].append(abs(100.0 * (blend / base - 1.0) - actual))
            for name, q in paths.items():
                pred = 100.0 * (q[i, h - 1] / base - 1.0)
                errors[name][h].append(abs(pred[4] - actual))
                covered[name][h].append(pred[0] <= actual <= pred[-1])

    mae = {m: {str(h): round(float(np.mean(e)), 2) for h, e in by_h.items()} for m, by_h in errors.items()}
    coverage = {m: {str(h): round(100.0 * float(np.mean(c))) for h, c in by_h.items()} for m, by_h in covered.items()}
    mean_mae = {m: float(np.mean(list(v.values()))) for m, v in mae.items()}
    result = {
        "asof": str(target.index[-1]),
        "first_origin": str(target.index[origins[0]]),
        "last_origin": str(target.index[origins[-1]]),
        "horizons": list(BACKTEST_HORIZONS),
        "n_forecasts": {str(h): len(errors["persistence"][h]) for h in BACKTEST_HORIZONS},
        "mae_pp": mae,
        "interval80_coverage_pct": coverage,
        "best_timesfm_variant": min(paths, key=mean_mae.get),
        "best_overall": min(mean_mae, key=mean_mae.get),
    }
    BACKTEST_CACHE.write_text(json.dumps(result, indent=2))
    return result


def get_backtest(compute: bool = True) -> dict | None:
    """Cached backtest, recomputed when a newer CPI month has arrived."""
    latest = str(load_frame()[TARGET].dropna().index[-1])
    if BACKTEST_CACHE.exists():
        cached = json.loads(BACKTEST_CACHE.read_text())
        if cached.get("asof") == latest:
            return cached
    return run_backtest() if compute else None


def forecast_inflation(horizon: int = MAX_HORIZON, variant: str | None = None) -> dict:
    horizon = max(1, min(MAX_HORIZON, horizon))
    frame = load_frame()
    target = frame[TARGET].dropna()
    if variant is None:
        backtest = get_backtest(compute=False)
        variant = backtest["best_timesfm_variant"] if backtest else "timesfm"
    q_index = timesfm_quantiles(frame, [len(target) - 1], horizon, variant == "timesfm_covariates")[0]

    future = pd.period_range(target.index[-1] + 1, periods=horizon, freq="M")
    base = target.reindex(future - 12).to_numpy()
    q_yoy = 100.0 * (q_index / base[:, None] - 1.0)
    history = yoy(target).dropna()
    return {
        "target": "National CPI (all Rwanda), year-on-year % change",
        "model": "google/timesfm-3.0-pytorch",
        "variant": variant,
        "covariates": [c for c in COVARIATES if c in frame.columns] if variant == "timesfm_covariates" else [],
        "last_observed": str(target.index[-1]),
        "quantile_levels": QUANTILES,
        "history": [{"period": str(p), "yoy": round(float(v), 2)} for p, v in history.iloc[-84:].items()],
        "forecast": [
            {
                "period": str(p),
                "index": [round(float(x), 2) for x in q_index[i]],
                "yoy": [round(float(x), 2) for x in q_yoy[i]],
            }
            for i, p in enumerate(future)
        ],
    }


def forecast_series(series_id: str, horizon: int = MAX_HORIZON) -> dict:
    """Univariate TimesFM forecast of any stored series, in its own units."""
    series = load_frame()[series_id].dropna()
    model = get_model()
    with _infer_lock:
        out = model.predict(series.to_numpy(dtype=np.float32), horizon, return_quantiles=True)
    future = pd.period_range(series.index[-1] + 1, periods=horizon, freq="M")
    return {
        "series_id": series_id,
        "last_observed": str(series.index[-1]),
        "model": "google/timesfm-3.0-pytorch",
        "quantile_levels": QUANTILES,
        "forecast": [
            {"period": str(p), "values": [round(float(x), 3) for x in out.quantiles[i]]} for i, p in enumerate(future)
        ],
    }


if __name__ == "__main__":
    bt = run_backtest()
    print(f"Backtest origins {bt['first_origin']} .. {bt['last_origin']}; MAE in pp of y/y inflation")
    print(f"{'model':22s}" + "".join(f"h={h:<6d}" for h in bt["horizons"]))
    for name, row in bt["mae_pp"].items():
        print(f"{name:22s}" + "".join(f"{row[str(h)]:<8.2f}" for h in bt["horizons"]))
    print("80% interval coverage:", bt["interval80_coverage_pct"])
    fc = forecast_inflation()
    print(f"\nForecast ({fc['variant']}), last observed {fc['last_observed']}:")
    for row in fc["forecast"]:
        print(f"  {row['period']}  median {row['yoy'][4]:5.1f}%   80% interval {row['yoy'][0]:5.1f} .. {row['yoy'][-1]:5.1f}")
