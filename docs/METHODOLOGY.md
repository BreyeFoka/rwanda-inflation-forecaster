# Methodology

This explains how we get the data, how the forecast is made, and how we tested it. The code for all of it is in `forecaster/`.

## 1. Data

`forecaster/ingest.py` collects everything into a SQLite database (`$DATA_DIR/godseye.db`). For every series it also saves the source, link, unit and when it was last fetched.

NISR data is read from the Excel files in `forecaster/nisr/` by `forecaster/nisr.py`:

- CPI time series: the all-Rwanda index and its 12 spending groups, the urban and rural indices (all items and food), and the urban analytical indices (local goods, imported goods, fresh products, energy, and the index without fresh products and energy). Base is February 2014 = 100, monthly from February 2009.
- PPI: all industry, mining, manufacturing, food manufacturing, beverages, electricity, water, local sales and exports. Monthly from December 2010.

The parser looks rows up by their codes and labels, and stops with an error if the layout changes, so a new NISR file can't quietly load the wrong rows.

The other sources come from APIs:

- IMF CPI dataset for Rwanda, used for 2004 to January 2009 (before the NISR file starts). Over the 212 months where both exist, NISR and IMF values differ by at most 0.01 index points, so the join is clean.
- IMF exchange rates, interest rates and world commodity prices (Brent, maize, rice, coffee, tea, urea).
- World Bank Global Economic Monitor for exports.
- WFP market food prices from HDX. For each food and month we take the median across markets, and skip months with fewer than three markets.
- Open-Meteo ERA5 rainfall at one point per province. Daily rain is added up per month and compared with the 1991–2020 average for that month.

If one source fails during a refresh, the old data for it is kept and the failure is reported.

## 2. What we forecast

We forecast the all-Rwanda CPI. Inflation is the change in the index compared with the same month a year earlier:

```
inflation(t) = 100 × (CPI(t) / CPI(t − 12) − 1)
```

The model forecasts the index itself, and we work out inflation from it afterwards. That way, when a big price jump from last year drops out of the comparison, the forecast handles it the same way the published figures will. We stop at 12 months, because after that we'd be dividing one forecast by another.

## 3. Methods we compared

| Method | How it works |
| --- | --- |
| No change | Next year's inflation is the same as today's. Any real model should beat this. |
| Seasonal ARIMA | SARIMA(1,1,1)(0,1,1)₁₂ on the log of the index, using the full history from 2004, refitted at every forecast date. This is the one the site uses. |
| TimesFM 3.0 | Google's pretrained time series model, used as is on the index history. It gives nine quantiles (10th to 90th percentile). |
| TimesFM 3.0 with extra data | The same model, also given past values of USD/RWF, Brent oil, world maize, local beans and Irish potato prices, and Eastern Province rainfall. Series that publish late are carried forward to the forecast date. |
| Average | The ARIMA forecast and the TimesFM median averaged together. |

## 4. How we tested them

For each of the last 72 months, every method makes forecasts 1, 3, 6 and 12 months ahead using only the data that existed in that month. Then we compare each forecast with the inflation that was actually published later.

We report two things:

- The average miss (mean absolute error), in percentage points of inflation.
- How often the real number fell inside the 80% range (between the 10th and 90th percentiles). If the range is right, that should happen about 80% of the time. For ARIMA this is the range from section 5, built at each date only from errors that were already known then.

The test reruns when a new CPI month comes in. The latest results are at `GET /backtest` and on the Data page.

## 5. The forecast on the site

The site uses seasonal ARIMA on the full history, with a range based on its own past errors.

How we picked the method without cheating: we compared candidates on forecasts made from January 2009 to July 2020, which is before the 72 months we publish. We tried full-history SARIMA, SARIMA on the last 120 months, damped exponential smoothing, AR models of monthly inflation, direct regressions of future on current inflation, and averages of these. Damped smoothing averaged with SARIMA was very slightly better on that period (2.70 against 2.78 points across horizons). We went with full-history SARIMA because it's simpler and almost as good. On the later 2020–2026 period, which we hadn't looked at, it had the lowest error of all of them.

The range: the model's own ranges and TimesFM's quantiles were both too narrow, because Rwanda's inflation has occasional big jumps and calm periods that change over time. So we build the range like this:

1. From every month since January 2009, the model forecasts 1 to 12 months ahead and we record how far off it was (in log terms).
2. Each error is divided by how volatile prices were when the forecast was made (standard deviation of the seasonally differenced monthly log changes over the previous 24 months).
3. For today's forecast, we take the 10th to 90th percentiles of those scaled errors for each horizon, multiply by today's volatility, and put them around the forecast.

So the range gets wider when prices have been volatile, like now, and narrower when things are calm. The 24-month window was also chosen on the 2009–2020 period. Right after a new CPI month, before the test has rerun, the site uses the model's own ranges and says so (`interval_method: "model"`).

TimesFM stays in the test only as a comparison, and for the food price projections. Its weights are under Google's TimesFM Non-Commercial License.

## 6. Town and village figures

Next to the forecast, `/overview` shows the latest yearly change for the urban, rural, core (urban without fresh products and energy), urban food, rural food, local goods, imported goods and PPI indices. These are shown as they are; we only forecast the all-Rwanda index.

## 7. AI analyst

`POST /analyst` builds factual statements from the headline figures, the last 24 months of inflation, the forecast and the backtest. OpenRouter only selects statement IDs. The server rejects unknown IDs and returns its own unchanged statements, or a no-data answer. The general briefing is cached for the exact fact set, and requests are limited per IP address per hour. The analyst selects relevant evidence; it does not create numbers or prose.

The statements also cover town and village inflation and factory prices (PPI).

## 8. Limits

- We forecast the all-Rwanda index. The central bank's 2–8% target is for the urban index, which we show separately but don't forecast.
- Rainfall is from one point per province.
- 12 months ahead, the range still contains the real number less than 80% of the time, and the average miss is several points. The 1 to 3 month forecasts are the part to rely on.
- These are our own estimates, not official figures.
