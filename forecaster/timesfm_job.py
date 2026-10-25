"""Runs everything that needs TimesFM, saves the results to the data volume, then exits.

The API starts this as a separate process so the 1.3 GB model and torch are only in memory
while it runs; when it exits, the memory goes back and the always-on API stays small.

Run:  python timesfm_job.py
"""
from __future__ import annotations

import model


def main() -> None:
    if model.get_backtest(compute=False) is None:
        print("timesfm job: running backtest", flush=True)
        model.run_backtest()
    if model.series_forecasts_stale():
        print("timesfm job: forecasting series", flush=True)
        model.compute_series_forecasts()
    print("timesfm job: done", flush=True)


if __name__ == "__main__":
    main()
