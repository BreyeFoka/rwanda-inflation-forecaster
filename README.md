# Rwanda Inflation Forecaster

Live app: <https://rwanda-inflation-forecaster.breye-foka.workers.dev>
API docs: <https://rwanda-inflation-api.onrender.com/docs>

This is our project for the NISR Big Data Hackathon 2026. It's a website that shows Rwanda's inflation rate and predicts where it will go over the next 12 months.

## Why we built it

Inflation affects everyone, from families buying food to businesses setting prices to the government planning its budget. But the official figures only tell you what already happened, and they come out a month late. We wanted a simple place where anyone can see the current inflation rate, what is driving it, and a forecast of the next 12 months.

We had two goals:

1. Help government institutions see price rises coming early, so they can take the right measures in time, for example support for families, food stock decisions, or adjusting policy.
2. Help ordinary people and businesses know what prices are likely to do, so they can plan their budgets, savings and purchases ahead of the rises.

This fits Rwanda's national priorities. NST2 (2024–2029), under its economic transformation pillar, aims to keep the economy stable, and stable prices are part of that. Vision 2050 aims for high living standards for all Rwandans, which depends on incomes keeping up with prices. Our project gives decision makers an early, tested view of where prices are going so they can act in time.

Around the forecast we added the things that help explain it: inflation in towns and villages, food prices, the exchange rate, world oil and grain prices, rainfall and factory prices.

## What's in the app

- Overview: current inflation, the forecast, and which kinds of spending went up the most.
- Inflation: the 12-month forecast with a likely range, inflation in towns and villages, factory prices (they usually move before shop prices), and the trend for each kind of spending.
- Food prices: market prices for beans, maize, potatoes, rice, cassava flour and other staples.
- Markets: exchange rate and world prices for oil, grain and fertiliser.
- Rainfall: rain in each province compared with a normal year, since bad rain means bad harvests and higher food prices.
- AI analyst: you can ask a question and it answers using only numbers that are already on the site.
- Data: how accurate our past forecasts were, where every number comes from, and how recent it is.

## Data we used

From NISR:

- Consumer Price Index time series (up to October 2026): whole country, towns, villages, food, local and imported goods, and the index without fresh food and energy.
- Producer Price Index (up to September 2026).

Other public sources:

- IMF: older CPI history (2004 to 2009), exchange rates, interest rates, world commodity prices.
- World Bank: exports.
- World Food Programme (through HDX): food prices in Rwandan markets.
- Open-Meteo: monthly rainfall per province since 1991.

The NISR Excel files are in `forecaster/nisr/`. Everything else is downloaded from the sources' APIs.

## How it works

The backend is in Python. `ingest.py` and `nisr.py` read all the sources and put them into one SQLite database (65 monthly series). We joined NISR's CPI onto the IMF's older data so the history goes back to 2004; where both exist they agree to within 0.01. For market food prices we take the median across markets so one strange market doesn't throw off the number.

For the forecast we use a seasonal ARIMA model from statsmodels. It learns the normal ups and downs in prices, including the yearly harvest pattern, and projects 12 months forward. We picked it by testing. We went back to each of the last 72 months, made a forecast using only the data that existed at that time, and compared it with what actually happened. We did the same with Google's TimesFM AI model and with a simple guess that inflation stays the same. ARIMA had the smallest errors at every time horizon:

| Method | 1 month ahead | 3 months | 6 months | 12 months |
| --- | --- | --- | --- | --- |
| No change | 1.90 | 4.53 | 8.09 | 12.91 |
| Seasonal ARIMA (what we use) | 1.19 | 3.04 | 4.82 | 8.21 |
| Google TimesFM 3.0 (test up to September 2026) | 1.26 | 3.35 | 5.57 | 10.02 |

The numbers are the average miss in percentage points of inflation, tested on data up to October 2026. The TimesFM row is from our previous full test (data up to September 2026), because the model file wouldn't download for the latest run. The ARIMA forecast's likely range contained the real figure 82% of the time one month ahead and 72% twelve months ahead (the aim is 80%). The 1 to 3 month forecasts are pretty reliable. 12 months ahead is still hard, mostly because of the 2022–23 price jump that nothing in the past data predicted.

The likely range around the forecast comes from how wrong the model was in the past, and it gets wider when prices have been jumping around a lot. It should contain the real number about 8 times out of 10.

For the AI analyst, the server first writes a list of fact sentences from the data (current inflation, each spending group, towns and villages, factory prices, the forecast and the accuracy test). When you ask a question, the AI model (through OpenRouter) picks up to four of those facts and writes a short answer from them. Before the answer is shown, the server checks that every number in it appears in the facts the AI picked. If any number doesn't match, the site shows the picked facts instead of the AI's sentence, so the AI can't make up numbers. If no fact fits, it says our data doesn't answer the question. The "quick summary" button doesn't use the AI at all: the server writes it straight from the data, so it is the same every time.

We tested it with questions where we already knew the answer from the data (26 November 2026):

| Question | Expected (from the data) | What the analyst answered |
| --- | --- | --- |
| What was inflation in October 2026? | 26.5% | "prices across Rwanda were 26.5% higher than a year before, up from 20.0% the month before. Rwanda's official headline inflation figure, which covers towns only, was 19.5%…" |
| How much did prices rise in villages compared with towns? | Villages 31.3%, towns 19.5% | "Prices in villages rose 31.3% compared with 19.5% in towns." |
| How accurate is the forecast one month ahead? | 1.2 points, range held 82% | "off by 1.2 percentage points on average, and the real figure fell inside its likely range 82% of the time" |
| What will inflation be in October 2027? | 14.4% (7.1% to 21.7%) | "most likely 14.4% higher than a year before, probably between 7.1% and 21.7%" |
| Which kind of spending had the biggest price rise? | Food and drinks, 39.1% | "Food and non-alcoholic beverages had the biggest rise… 39.1% more than a year before. The next largest were communication at 29.1% and transport at 25.9%." |
| Who will win the next football World Cup? | Not in our data | "Our data doesn't answer that question…" |

The free OpenRouter models sometimes time out; when that happens the site shows an error instead of an answer.

The frontend is React with TypeScript, Vite, Tailwind and Recharts. The site is hosted on Cloudflare Workers and the API on Render, with a small Cloudflare cron job that pings the API so the free server doesn't go to sleep.

More detail on the forecasting is in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Running it locally

First time only, set up the Python environment and the website:

```bash
cd forecaster
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python ingest.py        # build the database
cd ..
pnpm install
```

Then start everything with one command:

```bash
pnpm start:all --offline
```

Open <http://localhost:5173>. `Ctrl+C` stops both the API and the website.

`--offline` serves the saved data and doesn't download anything, which is what you want on a laptop. Without it (`pnpm start:all`), the API also refreshes all the data from the internet when it starts and tries to load the 1.3 GB TimesFM model, which is slow. To run only the API, use `pnpm forecaster:offline` (or `pnpm forecaster` for the full mode).

For the AI analyst to answer questions, put `OPENROUTER_API_KEY=...` in `forecaster/.env`. The quick summary works without it.

## Updating the data

The live API runs on Render's free plan, which is too small to download data and fit the models itself, so it serves a fixed snapshot of the data and results from `forecaster/snapshot/`. We update it once a month, after NISR publishes the new CPI (around the 10th):

1. Put the new `CPI_time_series_<Month>_<Year>.xls` (and PPI file if there is one) in `forecaster/nisr/`. The code always uses the newest file.
2. Run `ingest.py` to rebuild the database, then `python timesfm_job.py` and `python service.py --snapshot-forecast` to redo the accuracy test and forecast.
3. Copy `forecaster/data/` into `forecaster/snapshot/`, commit and push. Render redeploys the API on its own.

Run without `SNAPSHOT_MODE=1`, the API refreshes all sources by itself once a day, but that needs a bigger server (about 2 GB of memory).

## Limitations

- Our forecast is for the whole country, while the official headline number is for towns only. The site shows both.
- Rainfall is taken from one point in each province, not an average over the whole province.
- Some sources are slow to publish (IMF interest rates, WFP food prices). The site marks anything older than six months.
- The forecasts are our estimates, not official numbers.

## Use of AI

The main Idea came from daily realisation of people complaining about the price rise. we decided to get the idea develop it and implement it. We used AI coding assistants to help write parts of the code and documentation. We reviewed everything and take responsibility for the work we submitted.
