"""Reads the National Institute of Statistics of Rwanda (NISR) publications kept in nisr/.

NISR publishes these as Excel workbooks on statistics.gov.rw rather than through an API, so the
files are committed to the repository and replaced when NISR releases a new month or survey:

  CPI_time_series_<Month>_<Year>.xls      Consumer Price Index, urban / rural / all Rwanda, monthly
  PPI_time_series_<Month>_<Year>.xls      Producer Price Index (industry), monthly

Run:  python nisr.py   (prints what was parsed, as a check after replacing a file)
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

NISR_DIR = Path(__file__).with_name("nisr")
CPI_URL = "https://www.statistics.gov.rw/statistical-publications/subject/consumer-price-index-%28cpi%29"
PPI_URL = "https://www.statistics.gov.rw/statistical-publications/subject/producer-price-index-%28ppi%29"

DIVISIONS = {f"{i:02d}" for i in range(1, 13)}

# Rows of the CPI "Other_Indices" sheet (all urban), by label prefix -> (series_id, name).
CPI_OTHER = {
    "Local Goods Index": ("cpi.local", "CPI (urban): locally produced goods"),
    "Imported Goods Index": ("cpi.imported", "CPI (urban): imported goods"),
    "Fresh Products": ("cpi.fresh", "CPI (urban): fresh products"),
    "Energy index": ("cpi.energy", "CPI (urban): energy"),
    "General Index excluding fresh": ("cpi.core", "CPI (urban): excluding fresh products and energy (core)"),
}

# PPI rows kept, by sheet and index ID -> (series_id, name).
PPI_ROWS = {
    "PPI_ALLRwanda": {
        "R": ("ppi.all", "PPI: all industry"),
        "RB": ("ppi.mining", "PPI: mining and quarrying"),
        "RC": ("ppi.manufacturing", "PPI: manufacturing"),
        "RC10": ("ppi.food_mfg", "PPI: manufacture of food products"),
        "RC11": ("ppi.beverages", "PPI: manufacture of beverages"),
        "RD": ("ppi.electricity", "PPI: electricity, gas and steam"),
        "RE": ("ppi.water", "PPI: water supply and waste management"),
    },
    "PPI_Local": {"R": ("ppi.local", "PPI: products sold locally")},
    "PPI_Export": {None: ("ppi.export", "PPI: exported products")},
}


def latest(pattern: str) -> Path:
    """The newest file matching the pattern, by the month and year in its name."""
    months = {m: i for i, m in enumerate(
        ["january", "february", "march", "april", "may", "june", "july", "august",
         "september", "october", "november", "december"], start=1)}

    def key(p: Path) -> tuple[int, int]:
        m = re.search(r"_([A-Za-z]+)_(\d{4})", p.stem)
        return (int(m.group(2)), months.get(m.group(1).lower(), 0)) if m else (0, 0)

    files = sorted(NISR_DIR.glob(pattern), key=key)
    if not files:
        raise FileNotFoundError(f"no file matching {pattern} in {NISR_DIR}")
    return files[-1]


def _month_columns(header: pd.Series, first_col: int) -> dict[int, str]:
    """Column position -> YYYY-MM for every date in a header row."""
    out = {}
    for i, h in enumerate(header):
        if i >= first_col and pd.notna(h):
            try:
                out[i] = pd.Timestamp(h).strftime("%Y-%m")
            except (ValueError, TypeError):
                continue
    return out


def _row_values(row: pd.Series, cols: dict[int, str]) -> dict[str, float]:
    return {period: float(row.iloc[i]) for i, period in cols.items() if pd.notna(row.iloc[i])}


def cpi_series() -> tuple[Path, list[tuple[str, str, str, dict[str, float]]]]:
    """(file, [(series_id, name, unit, {YYYY-MM: value})]). Base: February 2014 = 100.

    All-Rwanda rows use the same ids as the IMF series they replace (cpi.all, cpi.cp01..12);
    urban and rural general and food indices, and the urban analytical indices, are new.
    """
    path = latest("CPI_time_series_*.xls*")
    book = pd.read_excel(path, sheet_name=None, header=None)
    unit = "index, Feb 2014 = 100"
    out = []
    for sheet, area in (("All Rwanda", None), ("Urban", "urban"), ("Rural", "rural")):
        frame = book[sheet]
        cols = _month_columns(frame.iloc[3], 5)
        for _, row in frame.iloc[5:].iterrows():
            code = str(row.iloc[2]).strip()
            label = str(row.iloc[3]).strip()
            if area is None:
                if code == "00":
                    out.append(("cpi.all", "CPI: All items", unit, _row_values(row, cols)))
                elif code in DIVISIONS:
                    out.append((f"cpi.cp{code}", f"CPI: {label}", unit, _row_values(row, cols)))
            elif code == "00":
                out.append((f"cpi.{area}", f"CPI ({area}): All items", unit, _row_values(row, cols)))
            elif code == "01":
                out.append((f"cpi.{area}_food", f"CPI ({area}): Food and non-alcoholic beverages", unit, _row_values(row, cols)))
    other = book["Other_Indices"]
    cols = _month_columns(other.iloc[3], 5)
    for _, row in other.iloc[4:].iterrows():
        label = str(row.iloc[3]).strip()
        for prefix, (sid, name) in CPI_OTHER.items():
            if label.startswith(prefix):
                out.append((sid, name, unit, _row_values(row, cols)))
    found = {s[0] for s in out}
    expected = {"cpi.all", "cpi.urban", "cpi.rural", *(f"cpi.cp{d}" for d in DIVISIONS), *(v[0] for v in CPI_OTHER.values())}
    if missing := expected - found:
        raise ValueError(f"CPI workbook layout changed; missing {sorted(missing)}")
    return path, out


def ppi_series() -> tuple[Path, list[tuple[str, str, str, dict[str, float]]]]:
    path = latest("PPI_time_series_*.xls*")
    book = pd.read_excel(path, sheet_name=None, header=None)
    out = []
    for sheet, wanted in PPI_ROWS.items():
        frame = book[sheet]
        cols = _month_columns(frame.iloc[2], 3)
        for _, row in frame.iloc[3:].iterrows():
            code = None if pd.isna(row.iloc[0]) else str(row.iloc[0]).strip()
            if code in wanted:
                sid, name = wanted.pop(code)
                out.append((sid, name, "index", _row_values(row, cols)))
        if wanted:
            raise ValueError(f"PPI workbook layout changed; {sheet} lacks {list(wanted)}")
    return path, out


if __name__ == "__main__":
    for label, fn in (("CPI", cpi_series), ("PPI", ppi_series)):
        path, rows = fn()
        print(f"{label}: {path.name}")
        for sid, name, _, obs in rows:
            print(f"  {sid:20s} n={len(obs):<4d} {min(obs)} .. {max(obs)}  {name}")
