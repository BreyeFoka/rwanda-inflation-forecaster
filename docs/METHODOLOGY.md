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
| Seasonal ARIMA | SARIMA(1,1,1)(0,1,1)₁₂ fitted to the log of the index over its full history (from 2004), refitted at each forecast date. **This is the forecast the site serves.** |
| TimesFM 3.0 | Google's pretrained time-series model, used zero-shot on the index history. It returns nine quantiles (10th to 90th percentile). |
| TimesFM 3.0 with driver data | Same model, also given past values of USD/RWF, Brent, world maize, local beans and Irish potato prices, and Eastern Province rainfall anomaly. Drivers that publish late are carried forward to the forecast date. |
| Average | The mean of the ARIMA path and the TimesFM median. |

## 4. Accuracy test

The test is a **rolling-origin backtest**. For each of the last 72 months, every method forecasts 1, 3, 6 and 12 months ahead using only the observations available at that month. Each forecast is compared with the inflation that was later published.

Two scores are reported:

- **Average miss (MAE)**, in percentage points of year-on-year inflation.
- **80% range coverage**: the share of outcomes that fell between the 10th and 90th percentiles. A well-calibrated range covers about 80%. For seasonal ARIMA this is the calibrated range described in section 5, built at each forecast date from errors already known by then.

The backtest is cached and recomputed when a new CPI month arrives. The current results are served at `GET /backtest` and shown on the Inflation page.

## 5. What the forecast on the site uses

The site serves **seasonal ARIMA on the full index history**, with a **calibrated range**.

**Choosing the method without peeking.** Candidates were compared on forecasts made from 2009-01 to 2020-07, before the 72-month window the site publishes. Full-history SARIMA, SARIMA on the last 120 months, damped exponential smoothing, AR models of monthly inflation with a constant, direct regressions of future on current inflation, and averages of these were all tried. Damped exponential smoothing averaged with SARIMA scored best on that window by a narrow margin (2.70 pp against 2.78 pp across horizons); full-history SARIMA was chosen as the simpler of two near-equal methods. On the later, unseen 2020–2026 window it had the lowest error of every candidate.

**The range.** The model's own normal-theory ranges, and TimesFM's quantiles, were too narrow because Rwanda's inflation has fat tails and shifting volatility. The served range is built in three steps:

1. Every month since 2009-01, the model forecasts 1 to 12 months ahead. Each miss is measured in log index terms.
2. Each miss is divided by the price volatility at the time the forecast was made: the standard deviation of seasonally differenced monthly log changes over the previous 24 months.
3. For today's forecast, the 10th to 90th percentiles of those scaled misses, at each horizon, are multiplied by today's volatility and placed around the forecast.

The range therefore widens when prices have been volatile, as now, and narrows when they have been calm. The 24-month window was also chosen on the 2009–2020 forecasts. Until the backtest has run after a new CPI month, the forecast falls back to the model's own ranges and says so (`interval_method: "model"`).

TimesFM 3.0 stays in the backtest as a comparison only. Its weights are released under Google's TimesFM Non-Commercial License, which excludes production use.

## 6. AI analyst

`POST /analyst` sends Gemini the headline figures, the last 24 months of inflation, the forecast and the backtest, with instructions to use only those figures. The general briefing is cached per data month, and requests are limited per IP address per hour. The analyst explains the numbers; it doesn't produce them.

## 7. Known limits

- The CPI is national. The central bank's target refers to urban inflation, which this source doesn't include.
- Rainfall comes from a single point in each province.
- Twelve months ahead, the calibrated range still holds the outcome less often than 80% (see the README), and the average miss is several points of inflation. The 1- to 3-month forecasts are the reliable part.
- Forecasts are statistical projections, not official figures.
