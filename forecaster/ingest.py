"""Pulls real monthly Rwanda macro series from public APIs into a local SQLite store.

Sources: IMF Data API (CPI, exchange rates, interest rates, commodity prices),
World Bank Global Economic Monitor, WFP food prices (via HDX), Open-Meteo ERA5 archive.

Run:  python ingest.py
"""
from __future__ import annotations

import csv
import io
import os
import re
import sqlite3
import statistics
import sys
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

import requests

# DATA_DIR points at a persistent volume in production.
DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent / "data"))
DB_PATH = DATA_DIR / "godseye.db"
IMF = "https://api.imf.org/external/sdmx/2.1/data"
WB = "https://api.worldbank.org/v2/country/RWA/indicator"
WFP_CSV = (
    "https://data.humdata.org/dataset/a4a84c1c-81d1-491b-9fbe-1955ae736508/resource/"
    "8c22eeb5-cc2e-46bc-8a0d-08b7486b2486/download/wfp_food_prices_rwa.csv"
)
METEO = "https://archive-api.open-meteo.com/v1/archive"
TIMEOUT = 90

COICOP = {
    "_T": "All items",
    "CP01": "Food and non-alcoholic beverages",
    "CP02": "Alcoholic beverages and tobacco",
    "CP03": "Clothing and footwear",
    "CP04": "Housing, water, electricity, gas and other fuels",
    "CP05": "Furnishings and household equipment",
    "CP06": "Health",
    "CP07": "Transport",
    "CP08": "Communication",
    "CP09": "Recreation and culture",
    "CP10": "Education",
    "CP11": "Restaurants and hotels",
    "CP12": "Miscellaneous goods and services",
}

# (series_id, name, unit, group, IMF dataflow, key)
IMF_SERIES = [
    ("fx.usd_rwf", "USD/RWF exchange rate (period average)", "RWF per USD", "fx", "IMF.STA,ER", "RWA.XDC_USD.PA_RT.M"),
    ("fx.eur_rwf", "EUR/RWF exchange rate (period average)", "RWF per EUR", "fx", "IMF.STA,ER", "RWA.XDC_EUR.PA_RT.M"),
    ("rate.policy", "Central bank policy rate", "% p.a.", "rates", "IMF.STA,MFS_IR", "RWA.MFS172_RT_PT_A_PT.M"),
    ("rate.lending", "Lending rate", "% p.a.", "rates", "IMF.STA,MFS_IR", "RWA.MFS162_RT_PT_A_PT.M"),
    ("rate.deposit", "Deposit rate", "% p.a.", "rates", "IMF.STA,MFS_IR", "RWA.MFS135_RT_PT_A_PT.M"),
    ("rate.interbank", "Money market (interbank) rate", "% p.a.", "rates", "IMF.STA,MFS_IR", "RWA.MMRT_RT_PT_A_PT.M"),
    ("rate.tbill", "Treasury bill yield", "% p.a.", "rates", "IMF.STA,MFS_IR", "RWA.GSTBILY_RT_PT_A_PT.M"),
    ("commodity.brent", "Brent crude oil", "USD per barrel", "commodities", "IMF.RES,PCPS", "G001.POILBRE.USD.M"),
    ("commodity.maize", "Maize (world price)", "USD per tonne", "commodities", "IMF.RES,PCPS", "G001.PMAIZMT.USD.M"),
    ("commodity.rice", "Rice (world price)", "USD per tonne", "commodities", "IMF.RES,PCPS", "G001.PRICENPQ.USD.M"),
    ("commodity.urea", "Urea fertiliser (world price)", "USD per tonne", "commodities", "IMF.RES,PCPS", "G001.PUREA.USD.M"),
    ("commodity.coffee", "Coffee, other mild arabica (world price)", "US cents per lb", "commodities", "IMF.RES,PCPS", "G001.PCOFFOTM.USD.M"),
    ("commodity.tea", "Tea, Kenyan (world price)", "US cents per kg", "commodities", "IMF.RES,PCPS", "G001.PTEA.USD.M"),
]

WB_SERIES = [
    ("trade.exports", "Merchandise exports", "USD millions", "trade", "DXGSRMRCHNSCD"),
]

# WFP commodity -> series slug. Retail prices, RWF per KG (oil per L).
WFP_COMMODITIES = {
    "Beans (dry)": "beans",
    "Maize": "maize",
    "Maize flour": "maize_flour",
    "Potatoes (Irish)": "irish_potatoes",
    "Rice (local)": "rice_local",
    "Rice (imported)": "rice_imported",
    "Cassava flour": "cassava_flour",
    "Sorghum": "sorghum",
    "Sugar": "sugar",
    "Oil": "cooking_oil",
}

PROVINCES = {
    "kigali": ("City of Kigali", -1.95, 30.06),
    "north": ("Northern Province (Musanze)", -1.50, 29.63),
    "south": ("Southern Province (Huye)", -2.60, 29.74),
    "east": ("Eastern Province (Nyagatare)", -1.30, 30.33),
    "west": ("Western Province (Karongi)", -2.06, 29.35),
}
CLIMATOLOGY_YEARS = range(1991, 2021)

SCHEMA = """
CREATE TABLE IF NOT EXISTS series (
    series_id TEXT PRIMARY KEY, name TEXT, unit TEXT, grp TEXT,
    source TEXT, source_url TEXT, fetched_at TEXT
);
CREATE TABLE IF NOT EXISTS observations (
    series_id TEXT, period TEXT, value REAL, PRIMARY KEY (series_id, period)
);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    return conn


def store(conn, series_id, name, unit, grp, source, source_url, obs: dict[str, float]) -> None:
    """Replaces a series wholesale so upstream revisions are picked up."""
    if not obs:
        raise ValueError("no observations returned")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with conn:
        conn.execute("DELETE FROM observations WHERE series_id = ?", (series_id,))
        conn.execute(
            "INSERT OR REPLACE INTO series VALUES (?,?,?,?,?,?,?)",
            (series_id, name, unit, grp, source, source_url, now),
        )
        conn.executemany(
            "INSERT INTO observations VALUES (?,?,?)",
            [(series_id, p, float(v)) for p, v in sorted(obs.items())],
        )


def fetch_imf(flow: str, key: str) -> list[tuple[dict, dict[str, float]]]:
    """Returns (series attributes, {YYYY-MM: value}) for every series matching the key."""
    url = f"{IMF}/{flow}/{key}"
    resp = requests.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    out = []
    for m in re.finditer(r"<Series ([^>]*)>(.*?)</Series>", resp.text, re.S):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        obs = {
            p.replace("-M", "-"): float(v)
            for p, v in re.findall(r'TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]+)"', m.group(2))
            if v not in ("", "NaN")
        }
        out.append((attrs, obs))
    return out


def ingest_cpi(conn) -> None:
    key = "RWA.CPI..IX.M"
    for attrs, obs in fetch_imf("IMF.STA,CPI", key):
        code = attrs.get("COICOP_1999")
        if code not in COICOP:
            continue
        sid = "cpi.all" if code == "_T" else f"cpi.{code.lower()}"
        store(conn, sid, f"CPI: {COICOP[code]}", "index, Feb 2014 = 100", "cpi",
              "IMF Consumer Price Index dataset (compiled from NISR)", f"{IMF}/IMF.STA,CPI/{key}", obs)


def ingest_imf(conn, sid, name, unit, grp, flow, key) -> None:
    result = fetch_imf(flow, key)
    if not result:
        raise ValueError("series not found")
    store(conn, sid, name, unit, grp, f"IMF {flow.split(',')[1]} dataset", f"{IMF}/{flow}/{key}", result[0][1])


def ingest_wb(conn, sid, name, unit, grp, indicator) -> None:
    url = f"{WB}/{indicator}?source=15&format=json&per_page=2000&date=2005M01:2035M12"
    payload = requests.get(url, timeout=TIMEOUT).json()
    obs = {
        o["date"].replace("M", "-"): o["value"]
        for o in (payload[1] or [])
        if o["value"] is not None and "M" in o["date"]
    }
    store(conn, sid, name, unit, grp, "World Bank Global Economic Monitor", url, obs)


def ingest_wfp(conn) -> None:
    resp = requests.get(WFP_CSV, timeout=TIMEOUT)
    resp.raise_for_status()
    national = defaultdict(lambda: defaultdict(list))
    for row in csv.DictReader(io.StringIO(resp.text)):
        slug = WFP_COMMODITIES.get(row["commodity"])
        if not slug or row["pricetype"] != "Retail" or row["priceflag"] == "forecast":
            continue
        if row["currency"] != "RWF" or row["unit"] not in ("KG", "L"):
            continue
        try:
            national[slug][row["date"][:7]].append(float(row["price"]))
        except ValueError:
            continue
    names = {v: k for k, v in WFP_COMMODITIES.items()}
    for slug, months in national.items():
        # Median across markets resists the outliers and changing market mix in the survey.
        obs = {period: statistics.median(prices) for period, prices in months.items() if len(prices) >= 3}
        unit = "RWF per litre" if slug == "cooking_oil" else "RWF per kg"
        store(conn, f"food.{slug}", f"{names[slug]}: retail price, median across markets", unit, "food",
              "WFP food price monitoring (Humanitarian Data Exchange)", WFP_CSV, obs)


def ingest_rainfall(conn) -> None:
    today = date.today()
    end = date(today.year, today.month, 1).fromordinal(date(today.year, today.month, 1).toordinal() - 1)
    for slug, (label, lat, lon) in PROVINCES.items():
        url = (f"{METEO}?latitude={lat}&longitude={lon}&start_date={CLIMATOLOGY_YEARS[0]}-01-01"
               f"&end_date={end.isoformat()}&daily=precipitation_sum&timezone=Africa%2FKigali")
        daily = requests.get(url, timeout=TIMEOUT).json()["daily"]
        monthly = defaultdict(float)
        for day, mm in zip(daily["time"], daily["precipitation_sum"]):
            if mm is not None:
                monthly[day[:7]] += mm
        normals = defaultdict(list)
        for period, mm in monthly.items():
            if int(period[:4]) in CLIMATOLOGY_YEARS:
                normals[period[5:]].append(mm)
        anomaly = {
            period: 100.0 * (mm / statistics.mean(normals[period[5:]]) - 1.0)
            for period, mm in monthly.items()
            if statistics.mean(normals[period[5:]]) > 0
        }
        src = "Open-Meteo historical weather archive (ERA5 reanalysis)"
        store(conn, f"rain.{slug}", f"Rainfall: {label}", "mm per month", "rainfall", src, url, dict(monthly))
        store(conn, f"rain_anom.{slug}", f"Rainfall anomaly vs 1991-2020 normal: {label}", "%", "rainfall",
              src, url, anomaly)


def run() -> dict[str, str]:
    """Runs every fetcher; a failed source keeps its previous data. Returns {job: 'ok' | error}."""
    conn = connect()
    jobs = [("cpi", lambda: ingest_cpi(conn))]
    jobs += [(s[0], lambda s=s: ingest_imf(conn, *s)) for s in IMF_SERIES]
    jobs += [(s[0], lambda s=s: ingest_wb(conn, *s)) for s in WB_SERIES]
    jobs += [("food", lambda: ingest_wfp(conn)), ("rainfall", lambda: ingest_rainfall(conn))]
    status = {}
    for name, job in jobs:
        try:
            job()
            status[name] = "ok"
        except Exception as exc:  # one dead upstream must not block the others
            status[name] = f"{type(exc).__name__}: {exc}"[:200]
    conn.close()
    return status


if __name__ == "__main__":
    result = run()
    for job, state in result.items():
        print(f"{job:20s} {state}")
    conn = connect()
    print()
    for row in conn.execute(
        "SELECT s.series_id, COUNT(*), MIN(o.period), MAX(o.period) FROM series s "
        "JOIN observations o USING (series_id) GROUP BY 1 ORDER BY 1"
    ):
        print("%-24s n=%-4d %s .. %s" % row)
    sys.exit(0 if all(v == "ok" for v in result.values()) else 1)
