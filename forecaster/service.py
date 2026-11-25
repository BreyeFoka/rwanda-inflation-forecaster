"""HTTP API over the real-data store, the inflation forecaster and the AI analyst.

Run:  uvicorn service:app --port 8001
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import ingest
import model

load_dotenv(Path(__file__).with_name(".env"))

ANALYST_MODEL = os.environ.get("OPENROUTER_MODEL", "openrouter/free")
ANALYST_API_URL = "https://openrouter.ai/api/v1/chat/completions"
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "https://dashboard.breyefoka.dev,http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"
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

ANALYST_PROMPT = """Select only facts that directly answer the user's question.
Return JSON only, in the form {"ids": ["F1", "F2"]}. Use only IDs in the supplied list.
Return {"ids": []} when the facts cannot answer the question. Do not write prose,
calculations, explanations, or facts of your own. For a general briefing, select
the most useful current inflation, forecast, and reliability facts."""


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


# Inflation measures shown beside the national rate: (series_id, short label, what it means).
BREAKDOWN_SERIES = [
    ("cpi.urban", "Towns", "Prices in towns. This is Rwanda's official headline inflation figure, and the central bank aims to keep it between 2% and 8%"),
    ("cpi.rural", "Villages", "Prices in rural areas"),
    ("cpi.core", "Underlying (towns)", "Town prices without fresh food and fuel, which jump around; shows the steadier trend"),
    ("cpi.urban_food", "Food in towns", "Food and drinks bought in towns"),
    ("cpi.rural_food", "Food in villages", "Food and drinks bought in rural areas"),
    ("cpi.imported", "Imported goods", "Goods brought in from abroad, sold in towns"),
    ("cpi.local", "Made in Rwanda", "Goods produced in Rwanda, sold in towns"),
    ("ppi.all", "Factory prices", "Prices Rwandan producers charge; rises here often reach shops a few months later"),
]


def _inflation_breakdown(frame: pd.DataFrame, meta: dict) -> list[dict]:
    out = []
    for sid, label, note in BREAKDOWN_SERIES:
        if sid not in frame.columns:
            continue
        rate = model.yoy(frame[sid].dropna()).dropna()
        out.append({"series_id": sid, "label": label, "note": note, "period": str(rate.index[-1]),
                    "yoy": round(float(rate.iloc[-1]), 2), "yoy_prev_month": round(float(rate.iloc[-2]), 2),
                    "yoy_12m_ago": round(float(rate.iloc[-13]), 2), "source": meta[sid]["source"]})
    return out


@app.get("/")
def root() -> dict:
    return {"service": "Rwanda Inflation Forecaster API", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health() -> dict:
    # snapshot: the site serves fixed data that is rebuilt and redeployed by hand, so it has no refresh button.
    return {"ok": True, "has_data": _has_data(), "snapshot": SNAPSHOT_MODE}


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
        "breakdown": _inflation_breakdown(frame, meta),
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


MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def _short_source(source: str) -> str:
    """A reader-friendly source name for the analyst's sentences."""
    for prefix, name in (("NISR", "National Institute of Statistics of Rwanda"), ("IMF", "IMF"), ("World Bank", "World Bank"),
                         ("WFP", "World Food Programme"), ("Open-Meteo", "Open-Meteo weather archive")):
        if source.startswith(prefix):
            return name
    return source


def _analyst_facts(context: dict) -> dict[str, str]:
    """Server-authored sentences are the only text the analyst may return."""
    facts: dict[str, str] = {}

    def add(sentence: str) -> None:
        # 2026-10 -> October 2026
        sentence = re.sub(r"\b(\d{4})-(\d{2})\b", lambda m: f"{MONTHS[int(m.group(2)) - 1]} {m.group(1)}", sentence)
        facts[f"F{len(facts) + 1}"] = sentence

    overview_data = context["overview"]
    inflation = overview_data["inflation"]
    add(f"In {inflation['period']}, prices across Rwanda were {inflation['yoy']}% higher than a year before (source: {_short_source(inflation['source'])}).")
    add(f"In {inflation['period']}, prices across Rwanda rose {inflation['mom']}% in a single month; the month before, they were {inflation['yoy_prev_month']}% higher than a year earlier.")
    for b in overview_data.get("breakdown", []):
        add(f"{b['label']}: in {b['period']}, prices were {b['yoy']}% higher than a year before, compared with {b['yoy_prev_month']}% the month before and {b['yoy_12m_ago']}% a year ago. {b['note']}. (Source: {_short_source(b['source'])}.)")
    for comp in overview_data["components"]:
        add(f"In {comp['period']}, {comp['name'].lower()} cost {comp['yoy']}% more than a year before; three months earlier the rise was {comp['yoy_3m_ago']}%.")
    for indicator in overview_data["indicators"]:
        add(f"In {indicator['period']}, {indicator['name']} was {indicator['value']} {indicator['unit']} (source: {_short_source(indicator['source'])}).")
    for rainfall in overview_data["rainfall"]:
        add(f"In {rainfall['period']}, {rainfall['name']} had {rainfall['rain_mm']} mm of rain, {rainfall['anomaly_pct']}% compared with usual for that month. This is measured at one place, not across the whole province.")
    for observed in context["inflation_history_last_24_months"]:
        add(f"In {observed['period']}, prices across Rwanda were {observed['yoy']}% higher than a year before.")
    for projected in context["inflation_forecast"]:
        add(f"Forecast for {projected['period']}: prices across Rwanda will most likely be {projected['median']}% higher than a year before, probably between {projected['interval80_low']}% and {projected['interval80_high']}%. This is an estimate, not a measured figure.")
    backtest = context["backtest"]
    if isinstance(backtest, dict):
        served = backtest.get("served", "sarima")
        for horizon in backtest.get("horizons", []):
            key = str(horizon)
            error = backtest.get("mae_pp", {}).get(served, {}).get(key)
            coverage = backtest.get("interval80_coverage_pct", {}).get(served, {}).get(key)
            if error is not None:
                sentence = f"When tested on past years, the site's forecast {horizon} month{'s' if horizon > 1 else ''} ahead was off by {error} percentage points on average."
                if coverage is not None:
                    sentence += f" The real figure fell inside its likely range {coverage}% of the time (it aims for 80%)."
                add(sentence)
    add("These figures show what happened and what is expected; they do not prove what caused prices to change.")
    add("Rwanda's official headline inflation figure covers towns only. This site's forecast covers the whole country, towns and villages, so the two numbers differ.")
    return facts


def _selected_fact_answer(content: str, facts: dict[str, str]) -> str:
    """Ignore every model-authored word except valid fact identifiers."""
    try:
        selection = json.loads(content.strip())
    except json.JSONDecodeError:
        return "The supplied data does not answer that question."
    ids = selection.get("ids") if isinstance(selection, dict) else None
    if not isinstance(ids, list) or len(ids) > 12 or any(not isinstance(i, str) or i not in facts for i in ids):
        return "The supplied data does not answer that question."
    unique_ids = list(dict.fromkeys(ids))
    return "\n\n".join(facts[i] for i in unique_ids) if unique_ids else "The supplied data does not answer that question."


@app.post("/analyst")
def analyst(body: AnalystRequest, request: Request) -> dict:
    """A free OpenRouter model explains the data and forecast."""
    _require_data()
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(503, "The AI analyst is not configured: OPENROUTER_API_KEY is not set on the server.")
    question = body.question.strip()
    context = _analyst_context()
    data_asof = context["forecast_model"]["last_observed"]
    facts = _analyst_facts(context)
    cache_key = hashlib.sha256((ANALYST_MODEL + json.dumps(facts, sort_keys=True)).encode()).hexdigest()
    if not question and cache_key in _briefing_cache:
        return {"answer": _briefing_cache[cache_key], "model": ANALYST_MODEL, "data_asof": data_asof, "cached": True}

    caller = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
    calls = _analyst_calls[caller]
    while calls and calls[0] < time.time() - 3600:
        calls.popleft()
    if len(calls) >= ANALYST_LIMIT_PER_HOUR:
        raise HTTPException(429, "Too many analyst requests from this address. Try again later.")
    calls.append(time.time())

    prompt = json.dumps({"question": question or "General briefing", "facts": facts})
    try:
        response = requests.post(
            ANALYST_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": ANALYST_MODEL, "messages": [
                {"role": "system", "content": ANALYST_PROMPT},
                {"role": "user", "content": prompt},
            ]},
            timeout=60,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise ValueError("empty response")
    except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        raise HTTPException(502, f"OpenRouter request failed{f' (HTTP {status})' if status else ''}.") from exc
    answer = _selected_fact_answer(content, facts)
    if not question and answer != "The supplied data does not answer that question.":
        _briefing_cache[cache_key] = answer
    return {"answer": answer, "model": ANALYST_MODEL, "data_asof": data_asof, "cached": False}


if __name__ == "__main__" and sys.argv[1:] == ["--snapshot-forecast"]:
    SNAPSHOT_FORECAST.write_text(json.dumps(model.forecast_inflation(model.MAX_HORIZON)))
    print(f"wrote {SNAPSHOT_FORECAST}")
