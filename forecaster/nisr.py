"""Reads the National Institute of Statistics of Rwanda (NISR) publications kept in nisr/.

NISR publishes these as Excel workbooks on statistics.gov.rw rather than through an API, so the
files are committed to the repository and replaced when NISR releases a new month or survey:

  CPI_time_series_<Month>_<Year>.xls      Consumer Price Index, urban / rural / all Rwanda, monthly
  PPI_time_series_<Month>_<Year>.xls      Producer Price Index (industry), monthly
  EICV7_Tables_Rwanda_Poverty_Profile.xlsx  Integrated Household Living Conditions Survey 7 (2024)

Run:  python nisr.py   (prints what was parsed, as a check after replacing a file)
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

NISR_DIR = Path(__file__).with_name("nisr")
CPI_URL = "https://www.statistics.gov.rw/statistical-publications/subject/consumer-price-index-%28cpi%29"
PPI_URL = "https://www.statistics.gov.rw/statistical-publications/subject/producer-price-index-%28ppi%29"
EICV7_URL = "https://www.statistics.gov.rw/statistical-publications/subject/household-surveys-%28eicv%29"

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


def cpi_food_weights() -> dict[str, float]:
    """Share of food and non-alcoholic beverages in each CPI basket, in %."""
    book = pd.read_excel(latest("CPI_time_series_*.xls*"), sheet_name=["All Rwanda", "Urban", "Rural"], header=None)
    out = {}
    for sheet, key in (("All Rwanda", "national"), ("Urban", "urban"), ("Rural", "rural")):
        frame = book[sheet]
        codes = frame.iloc[:, 2].astype(str).str.strip()
        total = float(frame.loc[codes == "00"].iloc[0, 4])
        food = float(frame.loc[codes == "01"].iloc[0, 4])
        out[key] = round(100.0 * food / total, 1)
    return out


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


# ---------------------------------------------------------------- EICV7 poverty profile

def _table(book: dict, number: str) -> pd.DataFrame:
    for name, frame in book.items():
        if name.strip().rstrip(".") == f"Table {number}":
            return frame
    raise ValueError(f"EICV7 workbook has no Table {number}")


def _rows(frame: pd.DataFrame) -> dict[str, pd.Series]:
    """First column label -> row, for rows that carry a label."""
    out = {}
    for _, row in frame.iterrows():
        label = row.iloc[0]
        if isinstance(label, str) and label.strip() and label.strip() not in out:
            out[label.strip()] = row
    return out


def _num(v) -> float:
    return round(float(v), 2)


PROVINCES = [("Kigali City", "City of Kigali"),("South", "Southern"), ("West", "Western"), ("North", "Northern"), ("East", "Eastern")]


def eicv7_profile() -> dict:
    """The poverty indicators the dashboard uses, from the EICV7 (2024) poverty profile tables.

    Changes are computed from the levels rather than read from the tables: NISR's Table 5.1
    prints +9 for the East's change in extreme poverty where its own levels give -5.2.
    Urban and rural poverty come from Table 5.2, whose levels agree with the changes printed
    in both tables (Table 5.1 shows 16.7% / 31.6% beside the same -6.2 / -13.7 point changes).
    """
    path = NISR_DIR / "EICV7_Tables_Rwanda_Poverty_Profile.xlsx"
    book = pd.read_excel(path, sheet_name=None, header=None)

    t51 = _rows(_table(book, "5.1"))  # cols: 1 = poor 2024, 3 = poor 2017, 6 = extreme 2024, 8 = extreme 2017
    t52 = _rows(_table(book, "5.2"))  # cols: 1 = 2024, 2 = 2017; first block headcount, second poverty gap
    t53 = _rows(_table(book, "5.3"))  # cols: 1 = median 2024, 2 = median 2017 (thousand RWF per adult equivalent)
    t02 = _rows(_table(book, "0.2"))  # cols: 1/2 electricity, 3/4 care, 5/6 sanitation (EICV5 / EICV7)
    t71 = _rows(_table(book, "7.1"))
    t69 = _rows(_table(book, "6.9"))  # cols: 1 non-poor, 2 poor, 3 all
    t610 = _rows(_table(book, "6.10"))
    t62 = _rows(_table(book, "6.2"))

    def poverty(row) -> dict:
        p24, p17, x24, x17 = (_num(row.iloc[i]) for i in (1, 3, 6, 8))
        return {"poor_2024": p24, "poor_2017": p17, "poor_change_pp": round(p24 - p17, 1),
                "extreme_2024": x24, "extreme_2017": x17, "extreme_change_pp": round(x24 - x17, 1)}

    provinces = []
    for short, long in PROVINCES:
        provinces.append({
            "name": short,
            **poverty(t51[short]),
            "median_consumption_2024": _num(t53[short].iloc[1]) * 1000,
            "median_consumption_2017": _num(t53[short].iloc[2]) * 1000,
            "gini": _num(t71[short].iloc[1]),
            "electricity_2024": _num(t02[long].iloc[2]),
        })

    # Table 5.2 repeats Urban/Rural/Rwanda in two blocks: headcount, then poverty gap.
    frame52 = _table(book, "5.2")
    blocks: dict[str, list] = {}
    for _, row in frame52.iterrows():
        label = row.iloc[0]
        if isinstance(label, str) and label.strip() in ("Urban", "Rural", "Rwanda"):
            blocks.setdefault(label.strip(), []).append(row)
    areas = []
    for area in ("Urban", "Rural"):
        head, gap = blocks[area]
        areas.append({
            "name": area,
            "poor_2024": _num(head.iloc[1]), "poor_2017": _num(head.iloc[2]),
            "poor_change_pp": round(_num(head.iloc[1]) - _num(head.iloc[2]), 1),
            "extreme_2024": _num(t51[area].iloc[6]), "extreme_2017": _num(t51[area].iloc[8]),
            "poverty_gap_2024": _num(gap.iloc[1]),
            "median_consumption_2024": _num(t53[area].iloc[1]) * 1000,
            "gini": _num(t71[area].iloc[1]),
            "electricity_2024": _num(t02[area].iloc[2]),
        })

    national = {
        **poverty(t51["Rwanda"]),
        "poor_ci_2024": str(t51["95% confidence interval"].iloc[1]),
        "poverty_gap_2024": _num(blocks["Rwanda"][1].iloc[1]),
        "poverty_gap_2017": _num(blocks["Rwanda"][1].iloc[2]),
        "median_consumption_2024": _num(t53["Rwanda"].iloc[1]) * 1000,
        "median_consumption_2017": _num(t53["Rwanda"].iloc[2]) * 1000,
        "gini": _num(t71["Estimate"].iloc[1]),
        "poverty_line_rwf": 560127,
        "extreme_poverty_line_rwf": 356432,
        "electricity_2017": _num(t02["National"].iloc[1]), "electricity_2024": _num(t02["National"].iloc[2]),
        "sanitation_2024": _num(t02["National"].iloc[6]),
        "children_poor": round((_num(t62["Boys (age<=16)"].iloc[1]) + _num(t62["Girls (age<=16)"].iloc[1])) / 2, 1),
        "adults_poor": round((_num(t62["Adult males"].iloc[1]) + _num(t62["Adult females"].iloc[1])) / 2, 1),
    }

    quintiles = [{"name": label, "median_consumption_2024": _num(t53[label].iloc[1]) * 1000,
                  "median_consumption_2017": _num(t53[label].iloc[2]) * 1000}
                 for label in ("Q1: lowest", "Q2", "Q3: mid", "Q4", "Q5: highest")]

    income = [{"name": label, "poor": _num(t69[label].iloc[2]), "non_poor": _num(t69[label].iloc[1])}
              for label in ("Farm wages", "Non-farm wages", "Independent farmer", "Independent non-farmer")]
    finance = {
        "savings_account": {"poor": _num(t69["Household has at least one savings account"].iloc[2]),
                            "non_poor": _num(t69["Household has at least one savings account"].iloc[1]),
                            "all": _num(t69["Household has at least one savings account"].iloc[3])},
        "mobile_money": {"poor": _num(t69["Household has at least one Momo"].iloc[2]),
                         "non_poor": _num(t69["Household has at least one Momo"].iloc[1]),
                         "all": _num(t69["Household has at least one Momo"].iloc[3])},
    }
    shock_rows = {"High food price": "High food prices", "Health Problem (Including death)": "Illness or death",
                  "Loss/reduced Income from employment": "Lost or reduced job income"}
    shocks = {"any_severe": {"poor": _num(t610["A least one severe shock/unusual situation"].iloc[2]),
                             "non_poor": _num(t610["A least one severe shock/unusual situation"].iloc[1])},
              "main_shock": []}
    for label, row in t610.items():
        name = shock_rows.get(label) or ("Environmental (flood, drought, landslide)" if label.startswith("Environmental") else
                                         "Farm-related (input costs, livestock disease)" if label.startswith("Farm-related") else None)
        if name:
            shocks["main_shock"].append({"name": name, "poor": _num(row.iloc[2]), "non_poor": _num(row.iloc[1])})

    return {
        "survey": "Rwanda's national household survey (EICV7, 2024), compared with the 2017 survey (EICV5)",
        "source": "National Institute of Statistics of Rwanda (NISR), EICV7 poverty profile tables",
        "source_url": EICV7_URL,
        "file": path.name,
        "notes": [
            "NISR re-estimated the 2017 figures using the 2024 method, so the two years can be compared fairly.",
            "Spending is per adult per year, at January 2024 prices (children count as part of an adult).",
            "The official line between town and village areas moved between the two surveys, so town and village changes are approximate.",
        ],
        "national": national,
        "provinces": provinces,
        "areas": areas,
        "quintiles": quintiles,
        "income_source": income,
        "finance": finance,
        "shocks": shocks,
        "cpi_food_weight_pct": cpi_food_weights(),
    }


if __name__ == "__main__":
    for label, fn in (("CPI", cpi_series), ("PPI", ppi_series)):
        path, rows = fn()
        print(f"{label}: {path.name}")
        for sid, name, _, obs in rows:
            print(f"  {sid:20s} n={len(obs):<4d} {min(obs)} .. {max(obs)}  {name}")
    print(json.dumps(eicv7_profile(), indent=1)[:3000])
