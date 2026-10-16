# Methodology

How the Rwanda Inflation Forecaster gets its data, makes its forecasts and tests them. Everything here matches the code in `forecaster/`.

## 1. Data store

`forecaster/ingest.py` pulls each source over its public API and writes monthly observations to a SQLite store (`$DATA_DIR/godseye.db`), along with each series' source, URL, unit and fetch time.

- **Consumer prices:** the IMF CPI dataset for Rwanda (compiled from NISR): all items plus 12 COICOP divisions, index Feb 2014 = 100.
- **Exchange and interest rates:** IMF ER and MFS_IR datasets.
- **World commodity prices:** IMF Primary Commodity Prices (Brent, maize, rice, coffee, tea, urea).
- **Exports:** World Bank Global Economic Monitor.
- **Food prices:** WFP market prices from the Humanitarian Data Exchange, reduced to a monthly median across markets for each staple (months with fewer than three market prices are skipped).
- **Rainfall:** Open-Meteo's ERA5 archive for one point per province. Daily rainfall is summed by month and compared with the 1991–2020 monthly normal to give an anomaly in percent.

If a source fails during a refresh, its previous data is kept and the failure is reported.

## 2. Target

The target is the **national CPI index, all items**. Inflation is the year-on-year change in that index:

```
inflation(t) = 100 × (CPI(t) / CPI(t − 12) − 1)
```

The models forecast the index level, not the inflation rate. Inflation for a future month is then the forecast index divided by the actual index twelve months earlier. That keeps base effects right: a past price jump leaves the year-on-year figure exactly twelve months later, as it will in the published data. Forecasts stop at 12 months, because beyond that the denominator would itself be a forecast.

## 3. Methods compared

| Method | How it works |
| --- | --- |
| No change | Next year's inflation equals today's. The floor every model has to beat. |
| Seasonal ARIMA | SARIMA(1,1,1)(0,1,1)₁₂ fitted to the log of the index over the last 120 months, refitted at each forecast date. |
| TimesFM 3.0 | Google's pretrained time-series model, used zero-shot on the index history. It returns nine quantiles (10th to 90th percentile). |
| TimesFM 3.0 with driver data | Same model, also given past values of USD/RWF, Brent, world maize, local beans and Irish potato prices, and Eastern Province rainfall anomaly. Drivers that publish late are carried forward to the forecast date. |
| Average | The mean of the ARIMA path and the TimesFM median. |

## 4. Accuracy test

The test is a **rolling-origin backtest**. For each of the last 72 months, every method forecasts 1, 3, 6 and 12 months ahead using only the observations available at that month. Each forecast is compared with the inflation that was later published.

Two scores are reported:

- **Average miss (MAE)**, in percentage points of year-on-year inflation.
- **80% range coverage** for the TimesFM variants: the share of outcomes that fell between the 10th and 90th percentiles. A well-calibrated range covers about 80%.

The backtest is cached and recomputed when a new CPI month arrives. The current results are served at `GET /backtest` and shown on the Inflation page.

## 5. What the forecast on the site uses

The site shows the TimesFM variant with the lower backtest error, with its 80% range. Seasonal ARIMA currently has lower error than both TimesFM variants (see the README), so a planned change is to serve the backtest winner or the average instead.

## 6. AI analyst

`POST /analyst` sends Gemini the headline figures, the last 24 months of inflation, the forecast and the backtest, with instructions to use only those figures. The general briefing is cached per data month, and requests are limited per IP address per hour. The analyst explains the numbers; it doesn't produce them.

## 7. Known limits

- The CPI is national. The central bank's target refers to urban inflation, which this source doesn't include.
- Rainfall comes from a single point in each province.
- The 80% range is too narrow at longer horizons, so treat the 6- and 12-month ranges as optimistic.
- Forecasts are statistical projections, not official figures.
