# Rwanda Inflation Forecaster

**Live:** [dashboard.breyefoka.dev](https://dashboard.breyefoka.dev) · **API:** [dashboard-api.breyefoka.dev](https://dashboard-api.breyefoka.dev/docs)

A public dashboard of Rwanda's economy, built on published data, with a 12-month inflation forecast. Every forecast method is tested against what actually happened; the site serves the one that won, with a range calibrated on its own past misses, and shows where it still falls short.

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

The site serves **seasonal ARIMA fitted to the full index history (2004 on)**. The method and its range settings were chosen on forecasts made from 2009 to mid-2020, so the test below, on the 72 months after that, is out of sample.

At each of the last 72 months, each method forecasts using only the data available then, and its error is measured against the inflation that followed.

| Method | Average miss, 1 month ahead | 3 months | 6 months | 12 months |
| --- | --- | --- | --- | --- |
| No change (inflation stays where it is) | 1.77 pp | 4.43 pp | 7.95 pp | 12.77 pp |
| **Seasonal ARIMA (served)** | **1.07 pp** | **2.81 pp** | **4.61 pp** | **7.88 pp** |
| TimesFM 3.0 | 1.23 pp | 3.28 pp | 5.39 pp | 9.80 pp |
| TimesFM 3.0 with driver data | 1.24 pp | 3.56 pp | 6.24 pp | 11.30 pp |
| Average of TimesFM and ARIMA | 1.12 pp | 2.99 pp | 4.81 pp | 8.24 pp |

How often the 80% range held the actual outcome (80% is the target):

| Range | 1 month | 3 months | 6 months | 12 months |
| --- | --- | --- | --- | --- |
| **Seasonal ARIMA, calibrated (served)** | **85%** | **83%** | **78%** | **74%** |
| TimesFM 3.0 quantiles | 83% | 71% | 63% | 59% |

*pp = percentage points of year-on-year inflation. Results as of August 2026 data; the live numbers are on the Inflation page and at `/backtest`.*

What the test shows:

- **The served forecast misses by about 40% less than "no change"** at every horizon, and by 13–20% less than TimesFM 3.0.
- **The range is calibrated.** It is built from the model's own past misses, scaled to how volatile prices have been over the last two years, so it widens in turbulent periods like now. It holds the outcome close to 80% of the time out to six months.
- **Adding driver data made TimesFM worse.** Exchange rate, oil, maize, food prices and rainfall, given as past-only inputs, didn't help.
- **Twelve months ahead is still hard.** No method tested gets the average miss below about 8 pp, largely because of the 2022–23 price shock, which past prices alone gave little warning of. Read the 1- to 3-month forecasts as the reliable part.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for the details.

## Architecture

```
public APIs ──> forecaster/ingest.py ──> SQLite store ──> forecaster/service.py (FastAPI)
                                                              │  SARIMA + calibrated ranges, backtest vs TimesFM
                                                              │  Gemini analyst
                                                              ▼
                                      React + Vite dashboard (static, served by Caddy)
```

- `forecaster/` is a Python service: data ingest, models, backtest and the HTTP API. The backtest takes several minutes on CPU and reruns when a new CPI month arrives; until then the forecast uses the model's own ranges.
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

- **National CPI, not urban.** The National Bank of Rwanda targets urban inflation, which this data source doesn't carry, so the 2–8% band on the charts is only a reference.
- **Single-location rainfall.** Each province's rainfall comes from one representative point, not a provincial average.
- **Publication lags.** Some sources publish months late. Stale series are marked on the site.

## Credits

The served forecast uses seasonal ARIMA from [statsmodels](https://www.statsmodels.org) (BSD). [TimesFM 3.0](https://huggingface.co/google/timesfm-3.0-pytorch) by Google Research is used for the backtest comparison and the food price projections; its weights are under Google's TimesFM Non-Commercial License. The analyst uses Google Gemini; its text can be wrong, so check it against the charts.
