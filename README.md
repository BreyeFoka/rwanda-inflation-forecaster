# Rwanda Inflation Forecaster

**Live:** [dashboard.breyefoka.dev](https://dashboard.breyefoka.dev) · **API:** [dashboard-api.breyefoka.dev](https://dashboard-api.breyefoka.dev/docs)

A public dashboard of Rwanda's economy, built on published data, with a 12-month inflation forecast from Google's TimesFM time-series model. Every forecast method is tested against what actually happened, and the site shows those results, including where the model falls short.

## What it shows

| Page | Contents |
| --- | --- |
| Overview | Latest inflation, food prices, exchange rate, policy rate and rainfall at a glance |
| Inflation | National CPI inflation, the 12-month forecast with an 80% range, and the accuracy test |
| Food prices | Retail prices of staples (beans, maize, cassava flour, Irish potatoes, oil and more) across Rwandan markets |
| Markets | USD/RWF and EUR/RWF exchange rates, interest rates, world commodity prices, exports |
| Rainfall | Monthly rainfall and its anomaly against the 1991–2020 normal for each province |
| AI analyst | A plain-language briefing, or answers to questions, written by Gemini from the figures on the site |
| Data | Every series with its source, unit, coverage and freshness, plus credits and licences |

## Data

47 monthly series, pulled from public APIs into a SQLite store and refreshed daily.

| Source | Series | Licence |
| --- | --- | --- |
| [IMF](https://data.imf.org) Consumer Price Index dataset, compiled from NISR | CPI, all items and 12 divisions (Feb 2014 = 100) | IMF terms of use |
| IMF Exchange Rates and Interest Rates datasets | USD/RWF, EUR/RWF; policy, money market, deposit, lending and T-bill rates | IMF terms of use |
| IMF Primary Commodity Prices | Brent, maize, rice, coffee, tea, urea | IMF terms of use |
| [World Bank Global Economic Monitor](https://datacatalog.worldbank.org/search/dataset/0037798) | Merchandise exports | CC BY 4.0 |
| [WFP food prices](https://data.humdata.org/dataset/wfp-food-prices-for-rwanda), via the Humanitarian Data Exchange | Retail staple prices, median across markets | CC BY-IGO |
| [Open-Meteo](https://open-meteo.com) historical archive (ERA5 reanalysis) | Rainfall for one location in each province, and its anomaly | CC BY 4.0 |

Rainfall contains modified Copernicus Climate Change Service information. This project is independent and isn't affiliated with or endorsed by the National Bank of Rwanda, NISR or any data provider.

## How the forecast works

The model forecasts the **CPI index level** twelve months ahead, and inflation is worked out from the forecast index. That way, past price jumps drop out of year-on-year inflation when they will in the real data.

Four methods are compared in a rolling test. At each of the last 72 months, each method forecasts using only the data available then, and its error is measured against the inflation that followed.

| Method | Average miss, 1 month ahead | 3 months | 6 months | 12 months |
| --- | --- | --- | --- | --- |
| No change (inflation stays where it is) | 1.83 pp | 4.44 pp | 8.00 pp | 12.79 pp |
| Seasonal ARIMA | **1.18 pp** | **2.95 pp** | **5.02 pp** | **8.36 pp** |
| TimesFM 3.0 | 1.26 pp | 3.35 pp | 5.57 pp | 10.02 pp |
| TimesFM 3.0 with driver data | 1.28 pp | 3.64 pp | 6.43 pp | 11.55 pp |
| Average of TimesFM and ARIMA | 1.19 pp | 3.09 pp | 5.08 pp | 8.62 pp |

*pp = percentage points of year-on-year inflation. Results as of September 2026 data; the live numbers are on the Inflation page and at `/backtest`.*

What the test shows:

- **Seasonal ARIMA beats TimesFM at every horizon.** A zero-shot foundation model doesn't automatically beat a classical model fitted to this one series.
- **Adding driver data made TimesFM worse.** Exchange rate, oil, maize, food prices and rainfall, given as past-only inputs, didn't help.
- **The 80% range is too narrow** beyond a few months. It held the outcome 82% of the time one month ahead but 59% of the time twelve months ahead.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for the details.

## Architecture

```
public APIs ──> forecaster/ingest.py ──> SQLite store ──> forecaster/service.py (FastAPI)
                                                              │  TimesFM 3.0, SARIMA, backtest
                                                              │  Gemini analyst
                                                              ▼
                                      React + Vite dashboard (static, served by Caddy)
```

- `forecaster/` is a Python service: data ingest, models, backtest and the HTTP API.
- `src/` is the React dashboard (Vite, Tailwind, Recharts), built to static files.
- Each part has its own Dockerfile. The service keeps its data and the ~1.3 GB model on a volume at `/data`.

## Run it locally

```bash
# Forecaster API
cd forecaster
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python ingest.py                 # pull every series into data/godseye.db
cd .. && pnpm forecaster                   # API on http://localhost:8001

# Dashboard
pnpm install
pnpm dev                                   # http://localhost:5173, reads VITE_API_URL (default http://localhost:8001)
```

Service settings (environment variables):

| Variable | Purpose |
| --- | --- |
| `DATA_DIR` | Where the SQLite store, backtest cache and model files live |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API |
| `GEMINI_API_KEY` | Enables the AI analyst; without it, `/analyst` returns 503 |
| `GEMINI_MODEL` | Gemini model used by the analyst |

## API

| Endpoint | Returns |
| --- | --- |
| `GET /overview` | Headline figures |
| `GET /catalog` | Every series with source, unit and coverage |
| `GET /series?ids=…` | One or more series (comma-separated IDs) |
| `GET /forecast` | 12-month inflation forecast with quantiles |
| `GET /backtest` | The accuracy test above |
| `POST /refresh` | Re-pulls every source (rate-limited) |
| `POST /analyst` | Gemini briefing or answer (rate-limited per IP) |

Interactive docs: [`/docs`](https://dashboard-api.breyefoka.dev/docs).

## Known limitations

- **The site serves the TimesFM forecast,** even though seasonal ARIMA has the lowest error in the test. The next step is to serve whichever method wins the backtest, or the average.
- **National CPI, not urban.** The National Bank of Rwanda targets urban inflation, which this data source doesn't carry, so the 2–8% band on the charts is only a reference.
- **Single-location rainfall.** Each province's rainfall comes from one representative point, not a provincial average.
- **Publication lags.** Some sources publish months late. Stale series are marked on the site.

## Credits

Forecasts use [TimesFM](https://github.com/google-research/timesfm) by Google Research (Apache 2.0). The analyst uses Google Gemini; its text can be wrong, so check it against the charts.
