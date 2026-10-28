"""HTTP API over the real-data store, the inflation forecaster and the Gemini analyst.

Run:  uvicorn service:app --port 8001
"""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import ingest
import model

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "https://dashboard.breyefoka.dev,http://localhost:3000,http://localhost:5173"
).split(",")
REFRESH_INTERVAL_S = 24 * 3600
REFRESH_COOLDOWN_S = 3600
ANALYST_LIMIT_PER_HOUR = 20
# Snapshot mode serves data and TimesFM results computed elsewhere, so the API runs without torch.
SNAPSHOT_MODE = os.environ.get("SNAPSHOT_MODE") == "1"
SNAPSHOT_FORECAST = ingest.DATA_DIR / "forecast.json"  # written by: python service.py --snapshot-forecast

_forecast_cache: dict[tuple, dict] = {}
_briefing_cache: dict[str, str] = {}
_refresh_lock = threading.Lock()
_backtest_lock = threading.Lock()
# Railway sleeps the API when idle; the store's age survives restarts, an in-memory timestamp would not.
_last_refresh = ingest.DB_PATH.stat().st_mtime if ingest.DB_PATH.exists() else 0.0
_analyst_calls: dict[str, deque] = defaultdict(deque)

# Series shown on the overview page.
HEADLINE_SERIES = [
    "fx.usd_rwf", "rate.policy", "rate.lending", "commodity.brent", "commodity.urea", "trade.exports",
    "food.beans", "food.maize", "food.irish_potatoes", "food.rice_local", "food.cassava_flour", "food.cooking_oil",
]

ANALYST_PROMPT = """You are a macroeconomist writing about Rwanda's economy for a general professional reader.
You are given real published data, a seasonal ARIMA forecast of national CPI inflation with quantiles (ranges calibrated on its past errors), and its backtest errors.
Rules:
- Use only the numbers in the data provided. Never invent a figure, date, policy decision or event.
- Always state the period a figure refers to. Flag series whose latest period is old.
- The CPI here is the national (all-Rwanda) index. BNR's 2-8% band targets urban headline CPI, so compare with care.
- Treat the forecast as a statistical extrapolation: report the median with its 80% interval and say how reliable the backtest shows it to be at that horizon.
- Explanations of why something moved are hypotheses unless the data shows it; word them that way.
- If the data cannot answer the question, say so.
Write plain text without markdown symbols. For a general briefing use these section titles on their own lines:
Where inflation stands, What is driving it, Outlook, Risks, What to watch next. For a specific question, answer it directly and briefly."""


def _has_data() -> bool:
    if not ingest.DB_PATH.exists():
        return False
    conn = sqlite3.connect(ingest.DB_PATH)
    try:
        return conn.execute("SELECT 1 FROM observations WHERE series_id = ? LIMIT 1", (model.TARGET,)).fetchone() is not None
    except sqlite3.OperationalError:
        return False
    finally:
        conn.close()


def _require_data() -> None:
    if not _has_data():
        raise HTTPException(503, "Data is still loading for the first time. Try again in a minute.")


def _run_ingest() -> dict[str, str]:
    global _last_refresh
    with _refresh_lock:
        status = ingest.run()
        _last_refresh = time.time()
        _forecast_cache.clear()
        _briefing_cache.clear()
        return status


TIMESFM_JOB = Path(__file__).with_name("timesfm_job.py")
TIMESFM_JOB_TIMEOUT_S = 3 * 3600


def _ensure_backtest() -> None:
    """Runs the TimesFM job in its own process when its saved results are missing or out of date.

    The model never loads in this process, so the API idles at a few hundred MB instead of ~2 GB.
    """
    if SNAPSHOT_MODE or not _backtest_lock.acquire(blocking=False):
        return
    try:
        if model.get_backtest(compute=False) is not None and not model.series_forecasts_stale():
            return
        result = subprocess.run([sys.executable, str(TIMESFM_JOB)], cwd=TIMESFM_JOB.parent, timeout=TIMESFM_JOB_TIMEOUT_S)
        if result.returncode != 0:
            print(f"timesfm job exited with code {result.returncode}", flush=True)
    finally:
        _backtest_lock.release()


def _background_loop() -> None:
    """Keeps the store fresh: load on first boot, update the TimesFM results, then refresh daily."""
    while True:
        try:
            if not _has_data() or time.time() - _last_refresh > REFRESH_INTERVAL_S:
                _run_ingest()
            _ensure_backtest()
        except Exception as exc:  # the loop must survive a bad upstream or a failed download
            print(f"background refresh failed: {type(exc).__name__}: {exc}", flush=True)
        time.sleep(REFRESH_INTERVAL_S if _has_data() else 60)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not SNAPSHOT_MODE:
        threading.Thread(target=_background_loop, daemon=True).start()
    yield


app = FastAPI(title="Rwanda Inflation Forecaster API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])


def _meta() -> dict[str, dict]:
    conn = sqlite3.connect(ingest.DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = {r["series_id"]: dict(r) for r in conn.execute("SELECT * FROM series")}
    conn.close()
    return rows


def _pct(new: float, old: float | None) -> float | None:
    return None if old is None or pd.isna(old) or old == 0 else round(100.0 * (new / old - 1.0), 2)


def _change(new: float, old: float | None, in_points: bool) -> float | None:
    """Interest rates move in percentage points; everything else in percent."""
    if in_points:
        return None if old is None or pd.isna(old) else round(float(new - old), 2)
    return _pct(new, old)


def _snapshot(frame: pd.DataFrame, meta: dict, sid: str) -> dict:
    series = frame[sid].dropna()
    last = series.index[-1]
    in_points = meta[sid]["unit"].startswith("%")
    return {
        "series_id": sid,
        "name": meta[sid]["name"],
        "unit": meta[sid]["unit"],
        "group": meta[sid]["grp"],
        "source": meta[sid]["source"],
        "period": str(last),
        "value": round(float(series.iloc[-1]), 2),
        "change_unit": "pp" if in_points else "%",
        "change_mom": _change(series.iloc[-1], series.get(last - 1), in_points),
        "change_yoy": _change(series.iloc[-1], series.get(last - 12), in_points),
    }


@app.get("/")
def root() -> dict:
    return {"service": "Rwanda Inflation Forecaster API", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "has_data": _has_data()}


@app.get("/overview")
def overview() -> dict:
    _require_data()
    frame, meta = model.load_frame(), _meta()
    cpi = frame[model.TARGET].dropna()
    inflation = model.yoy(cpi).dropna()
    components = []
    for sid in sorted(c for c in frame.columns if c.startswith("cpi.cp")):
        comp = model.yoy(frame[sid].dropna()).dropna()
        components.append({"series_id": sid, "name": meta[sid]["name"].removeprefix("CPI: "),
                           "period": str(comp.index[-1]), "yoy": round(float(comp.iloc[-1]), 2),
                           "yoy_3m_ago": round(float(comp.iloc[-4]), 2)})
    rainfall = []
    for sid in sorted(c for c in frame.columns if c.startswith("rain_anom.")):
        anom, mm = frame[sid].dropna(), frame[sid.replace("rain_anom", "rain")].dropna()
        rainfall.append({"series_id": sid, "name": meta[sid]["name"].split(": ", 1)[1], "period": str(anom.index[-1]),
                         "rain_mm": round(float(mm.iloc[-1]), 1), "anomaly_pct": round(float(anom.iloc[-1])),
                         # Sum of the last three months against the same months' normal.
                         "anomaly_3m_pct": round(100.0 * (mm.iloc[-3:].sum() / (mm.iloc[-3:] / (1 + anom.iloc[-3:] / 100)).sum() - 1))})
    return {
        "inflation": {
            "name": "National CPI (all Rwanda), year-on-year",
            "period": str(inflation.index[-1]),
            "yoy": round(float(inflation.iloc[-1]), 2),
            "yoy_prev_month": round(float(inflation.iloc[-2]), 2),
            "mom": _pct(cpi.iloc[-1], cpi.iloc[-2]),
            "source": meta[model.TARGET]["source"],
        },
        "components": sorted(components, key=lambda c: -c["yoy"]),
        "indicators": [_snapshot(frame, meta, sid) for sid in HEADLINE_SERIES if sid in frame.columns],
        "rainfall": rainfall,
        "sources": sorted({(m["source"], m["fetched_at"][:10]) for m in meta.values()}),
    }


@app.get("/indicators")
def indicators(group: str) -> list[dict]:
    """Latest value and changes for every series in a group (fx, rates, commodities, food, trade)."""
    _require_data()
    frame, meta = model.load_frame(), _meta()
    return [_snapshot(frame, meta, sid) for sid in sorted(meta) if meta[sid]["grp"] == group]


@app.get("/series")
def series(ids: str, months: int = 120, transform: str = "level") -> dict:
    """Observations for one or more series; transform=yoy returns the % change on a year earlier."""
    _require_data()
    frame, meta = model.load_frame(), _meta()
    out = {}
    for sid in ids.split(","):
        if sid not in frame.columns:
            raise HTTPException(404, f"unknown series {sid}")
        obs = frame[sid].dropna()
        if transform == "yoy":
            obs = model.yoy(obs).dropna()
        obs = obs.iloc[-months:]
        out[sid] = {**meta[sid], "observations": [{"period": str(p), "value": round(float(v), 3)} for p, v in obs.items()]}
    return out


@app.get("/catalog")
def catalog() -> list[dict]:
    _require_data()
    conn = sqlite3.connect(ingest.DB_PATH)
    rows = conn.execute(
        "SELECT s.series_id, s.name, s.unit, s.grp, s.source, s.source_url, s.fetched_at, COUNT(*), MIN(o.period), MAX(o.period) "
        "FROM series s JOIN observations o USING (series_id) GROUP BY 1 ORDER BY s.grp, 1"
    ).fetchall()
    conn.close()
    keys = ["series_id", "name", "unit", "group", "source", "source_url", "fetched_at", "n", "first_period", "last_period"]
    return [dict(zip(keys, r)) for r in rows]


@app.get("/forecast")
def forecast(horizon: int = model.MAX_HORIZON) -> dict:
    _require_data()
    if SNAPSHOT_MODE and SNAPSHOT_FORECAST.exists():
        # Fitting SARIMA takes minutes on a free instance's CPU share, so the snapshot ships the forecast.
        saved = json.loads(SNAPSHOT_FORECAST.read_text())
        return {**saved, "forecast": saved["forecast"][: max(1, min(model.MAX_HORIZON, horizon))]}
    # Keyed on the backtest too: the first forecast after a new CPI month uses model ranges until it lands.
    calibrated = model.get_backtest(compute=False) is not None
    key = ("inflation", horizon, str(model.load_frame()[model.TARGET].dropna().index[-1]), calibrated)
    if key not in _forecast_cache:
        _forecast_cache[key] = model.forecast_inflation(horizon)
    return _forecast_cache[key]


@app.get("/forecast/series")
def forecast_one(series_id: str, horizon: int = model.MAX_HORIZON) -> dict:
    _require_data()
    frame = model.load_frame()
    if series_id not in frame.columns:
        raise HTTPException(404, f"unknown series {series_id}")
    horizon = max(1, min(model.SERIES_FORECAST_HORIZON, horizon))
    cached = model.cached_series_forecast(series_id, horizon)
    if cached is None:
        threading.Thread(target=_ensure_backtest, daemon=True).start()
        return JSONResponse({"status": "computing"}, status_code=202)
    return cached


@app.get("/backtest")
def backtest():
    """Returns the cached backtest, or 202 while it computes in the background (minutes on CPU)."""
    _require_data()
    cached = model.get_backtest(compute=False)
    if cached:
        return cached
    threading.Thread(target=_ensure_backtest, daemon=True).start()
    return JSONResponse({"status": "computing"}, status_code=202)


@app.post("/refresh")
def refresh() -> dict:
    """Re-pulls every source; the backtest recomputes itself when a new CPI month lands."""
    if SNAPSHOT_MODE:
        raise HTTPException(403, "This deployment serves a fixed data snapshot.")
    wait = REFRESH_COOLDOWN_S - (time.time() - _last_refresh)
    if wait > 0:
        raise HTTPException(429, f"Data was refreshed recently. Try again in {int(wait // 60) + 1} minutes.")
    if _refresh_lock.locked():
        raise HTTPException(409, "A refresh is already running.")
    status = _run_ingest()
    return {"status": status, "failed": [k for k, v in status.items() if v != "ok"]}


class AnalystRequest(BaseModel):
    question: str = Field(default="", max_length=1000)


def _analyst_context() -> dict:
    fc = forecast()
    return {
        "today": time.strftime("%Y-%m-%d"),
        "overview": overview(),
        "inflation_history_last_24_months": fc["history"][-24:],
        "inflation_forecast": [
            {"period": f["period"], "median": f["yoy"][4], "interval80_low": f["yoy"][0], "interval80_high": f["yoy"][8]}
            for f in fc["forecast"]
        ],
        "forecast_model": {"model": fc["model"], "variant": fc["variant"], "last_observed": fc["last_observed"]},
        "backtest": model.get_backtest(compute=False) or "not computed yet",
    }


@app.post("/analyst")
def analyst(body: AnalystRequest, request: Request) -> dict:
    """Gemini writes a briefing, or answers a question, from the real data and the model output."""
    _require_data()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "The AI analyst is not configured: GEMINI_API_KEY is not set on the server.")
    question = body.question.strip()
    data_asof = forecast()["last_observed"]
    if not question and data_asof in _briefing_cache:
        return {"answer": _briefing_cache[data_asof], "model": GEMINI_MODEL, "data_asof": data_asof, "cached": True}

    caller = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
    calls = _analyst_calls[caller]
    while calls and calls[0] < time.time() - 3600:
        calls.popleft()
    if len(calls) >= ANALYST_LIMIT_PER_HOUR:
        raise HTTPException(429, "Too many analyst requests from this address. Try again later.")
    calls.append(time.time())

    from google import genai
    from google.genai import types

    prompt = (f"Question: {question}\n\n" if question else "Write the general briefing.\n\n") + f"DATA:\n{json.dumps(_analyst_context())}"
    try:
        # Hold the client for the whole call: newer google-genai closes it once it is unreferenced.
        with genai.Client(api_key=api_key) as client:
            response = client.models.generate_content(
                model=GEMINI_MODEL, contents=prompt, config=types.GenerateContentConfig(system_instruction=ANALYST_PROMPT)
            )
    except Exception as exc:
        raise HTTPException(502, f"Gemini request failed: {str(exc)[:300]}")
    answer = response.text or ""
    if not question:
        _briefing_cache[data_asof] = answer
    return {"answer": answer, "model": GEMINI_MODEL, "data_asof": data_asof, "cached": False}


if __name__ == "__main__" and sys.argv[1:] == ["--snapshot-forecast"]:
    SNAPSHOT_FORECAST.write_text(json.dumps(model.forecast_inflation(model.MAX_HORIZON)))
    print(f"wrote {SNAPSHOT_FORECAST}")
