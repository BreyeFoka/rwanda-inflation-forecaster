# Rwanda Macroeconomic & Inflation Intelligence Engine
## Comprehensive System Specification & Technical Architecture Document
**Classification: Sovereign Macroeconomic Surveillance & Forecasting System**  
**Version:** 2.4.0-PROD  
**Target Entities:** National Bank of Rwanda (BNR), National Institute of Statistics of Rwanda (NISR), Ministry of Agriculture and Animal Resources (MINAGRI), Rwanda Utilities Regulatory Authority (RURA)  
**Publication Date:** October 2026  

---

### Executive Summary

The **Rwanda Macroeconomic & Inflation Intelligence Engine** is a sovereign-grade macroeconomic surveillance and forecasting platform built to provide a unified, end-to-end "God's Eye View" of all factors impacting Rwanda's domestic price stability, economic growth, and financial stability.

The system harmonizes real-time and monthly time-series data across four distinct economic transmission clusters, processes dynamic transmission lags, and generates forward-looking inflation projections through a dual-engine architecture:
1. **Google TimesFM 2.0 (Time-series Foundation Model)**: A zero-shot decoder-only patch transformer pretrained on 100B+ time-series observations, projecting multi-horizon probabilistic quantile bands ($p_{05}, p_{10}, p_{25}, p_{50}, p_{75}, p_{90}, p_{95}$) calibrated directly against the BNR target band ($2.0\% - 5.0\% - 8.0\%$).
2. **Gemini 3.8 Flash Hybrid Policy Analyst**: An executive macroeconomic intelligence reasoning layer that synthesizes quantitative lag matrices into actionable policy briefings and inter-agency directives for the Monetary Policy Committee (MPC) and ministerial stakeholders.

---

### 1. System Architecture & Component Diagram

```
                                      +---------------------------------------------+
                                      |         MACROECONOMIC DATA HARVEST          |
                                      +---------------------------------------------+
                                      | [1] NISR Open Data (CPI, PPI, GDP)          |
                                      | [2] BNR Daily FX, M2/M3 & CBR Corridor       |
                                      | [3] MINAGRI e-Soko Wholesale Granary Prices |
                                      | [4] Meteo Rwanda 5-Province Rainfall Grid   |
                                      | [5] EAC Corridor Transit Manifests (Rusumo)  |
                                      +---------------------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |        5-STAGE AUTOMATED ETL PIPELINE       |
                                      +---------------------------------------------+
                                      | Stage 1: Ingestion & Schema Sanitization   |
                                      | Stage 2: Normalization (Base Feb 2014=100)  |
                                      | Stage 3: Polynomial Transmission Lags Matrix|
                                      | Stage 4: TimesFM Patch Tokenizer (P=32)     |
                                      | Stage 5: Quantile Inference & BNR Bounds    |
                                      +---------------------------------------------+
                                                             |
                              +------------------------------+------------------------------+
                              |                                                             |
                              v                                                             v
              +-------------------------------+                             +-------------------------------+
              |   GOOGLE TIMESFM 2.0 ENGINE   |                             |   GEMINI 3.8 FLASH ANALYST    |
              +-------------------------------+                             +-------------------------------+
              | - Decoder-only Patch Transformer |                             | - Structural Shock Attribution|
              | - Horizon: 1 to 24 Months Ahead |                             | - Urban vs. Rural Basket Split|
              | - Quantile Fan Bands (50/80/95%)|                             | - Inter-Agency Action Directs |
              | - BNR Target Corridor Breach %  |                             | - MPC Resolution Drafting     |
              +-------------------------------+                             +-------------------------------+
                              |                                                             |
                              +------------------------------+------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |        EXECUTIVE "GOD'S EYE" DASHBOARD       |
                                      +---------------------------------------------+
                                      | - Live BNR Target Band (2%–5%–8%) Fan Chart |
                                      | - Top Inflation Driver Attribution Cards    |
                                      | - Interactive Transmission Lag Stress Sim   |
                                      | - 5-Province Granary Vulnerability Heatmap  |
                                      | - Data Pipeline Studio & Bulk CSV Ingestion |
                                      +---------------------------------------------+
```

---

### 2. Macroeconomic Indicator Taxonomy (The 4 Surveillance Clusters)

The engine organizes Rwanda's macroeconomic reality into four interrelated clusters:

#### Cluster A: Official Domestic Metrics (NISR, BNR, MINAGRI)
* **National Consumer Price Index (CPI)**:
  * **Headline CPI**: $5.1\%$ YoY (Base: February 2014 = 100).
  * **Urban CPI**: $4.8\%$ YoY. Primary basket weight: Housing, water, electricity, gas & other fuels ($21.2\%$), Transport ($12.5\%$), Food & non-alcoholic beverages ($25.8\%$).
  * **Rural CPI**: $5.4\%$ YoY. Primary basket weight: Food & non-alcoholic beverages ($46.2\%$). Highly sensitive to domestic agricultural output.
* **National Bank of Rwanda (BNR) Policy Benchmark**:
  * **Central Bank Rate (CBR)**: $6.50\%$.
  * **Statutory Target Band**: Floor $2.0\%$, Medium-Term Target $5.0\%$, Ceiling $8.0\%$.
  * **Exchange Rates**: USD/RWF $1,388.50$ (YTD Depreciation $6.4\%$), EUR/RWF $1,515.20$, KES/RWF $10.75$, UGX/RWF $0.37$.
  * **Monetary Aggregates**: Broad Money (M2) Growth YoY $+12.3\%$, Extended Broad Money (M3) YoY $+14.2\%$, Private Sector Credit Growth $+13.8\%$.
* **MINAGRI Granary & Agricultural Indicators**:
  * **Surveillance Season**: Season A (Vegetative & Germination).
  * **National Yield Forecast**: $+3.8\%$ YoY.
  * **Key Food Basket Wholesale Prices (e-Soko)**:
    1. *Dry Beans*: $860\text{ RWF/kg}$ ($-4.5\%$ MoM).
    2. *Maize Grain*: $590\text{ RWF/kg}$ ($+1.8\%$ MoM).
    3. *Irish Potatoes (Kinigi)*: $460\text{ RWF/kg}$ ($-6.2\%$ MoM, Musanze/Burera harvest).
    4. *Cassava Flour*: $520\text{ RWF/kg}$ ($+0.5\%$ MoM, Southern Province).
    5. *Rice (Local Kigori)*: $1,280\text{ RWF/kg}$ ($+2.1\%$ MoM, Bugarama marshlands).

#### Cluster B: Regional EAC Corridors & Fuel Logistics
* **EAC Trade Corridors**:
  * *Uganda (Gatuna/Katuna Border)*: Volume $+7.8\%$ YoY (maize, dairy, cement).
  * *Tanzania (Rusumo Border / Central Corridor)*: Volume $+5.2\%$ YoY (transit freight from Dar es Salaam Port).
  * *Kenya (Northern Corridor via Malaba/Gatuna)*: Volume $+4.1\%$ YoY (refined consumables, pharmaceuticals).
* **Fuel & Transport Freight Tariffs**:
  * *Global Brent Crude*: $\$78.50/\text{bbl}$ ($-1.8\%$ MoM).
  * *Kigali Petrol Pump Price (RURA)*: $1,639\text{ RWF/L}$.
  * *Kigali Diesel Pump Price (RURA)*: $1,632\text{ RWF/L}$.
  * *Dar es Salaam to Kigali Freight Tariff*: $\$3,650\text{ per 40ft Container}$ ($4.5\text{ transit days}$).

#### Cluster C: Climate, Meteorology & Soil Moisture
* **Meteo Rwanda Provincial Precipitation Matrix**:
  * *Northern Province (Musanze/Burera)*: $+8\%$ anomaly (Favorable volcanic soil tuber moisture).
  * *Western Province (Rubavu/Karongi)*: $+4\%$ anomaly (Good moisture, erosion monitoring along Kivu belt).
  * *Southern Province (Huye/Nyanza)*: $-2\%$ anomaly (Normal seasonal rainfall).
  * *Eastern Province (Nyagatare/Kayonza/Kirehe)*: $-14\%$ anomaly (Delayed onset watch, legume vulnerability).
  * *City of Kigali*: $0\%$ anomaly (Normal urban precipitation).
* **National Climate Risk Score**: $3.2 / 10.0$ (Low-to-Moderate).

#### Cluster D: Micro-Market & Regulated Utility Tariffs
* **Cross-Border Trade Index (CBTI)**: $106.4$.
* **Fertilizer Subsidy Scheme (SNAS - Smart Nkunganire)**:
  * DAP Subsidized Price: $980\text{ RWF/kg}$.
  * Urea Subsidized Price: $890\text{ RWF/kg}$.
* **Regulated Utilities (RURA)**:
  * Electricity (Residential Lifeline): $227\text{ RWF/kWh}$.
  * Water (Residential Tariff): $340\text{ RWF/m}^3$.
  * Cooking Gas (LPG): $1,450\text{ RWF/kg}$.
  * Public Bus Fare: $29.0\text{ RWF/km}$.

---

### 3. Google TimesFM 2.0 Integration & Mathematical Formulation

Google TimesFM (Time-series Foundation Model) is implemented to generate multi-horizon zero-shot forecasts without requiring localized retraining iterations.

#### 3.1 Input Patch Tokenization
Given an ingested univariate or covariate-augmented sequence of $T$ historical observations:
$$X = (x_1, x_2, \dots, x_T), \quad \text{where } T \ge 12$$
TimesFM segments the sequence into non-overlapping patches of length $P = 32$:
$$p_k = (x_{(k-1)P + 1}, \dots, x_{kP})$$
Each patch is mapped via a learned linear projection layer into the transformer embedding dimension $D = 1280$. The temporal frequency identifier is passed as $1$ (denoting monthly frequency $M$).

#### 3.2 Causal Transformer Projection
The encoded patches pass through 20 causal transformer decoder blocks with multi-head self-attention. The model propagates autoregressively across the user-selected forward horizon $H \in [1, 24]$ months:
$$\hat{y}_{t+h} = \mathcal{F}_{\text{TimesFM}}\left(X_{1:t}, \Theta_{\text{pretrained}}\right)$$

#### 3.3 Dynamic Transmission Covariate Conditioning
The foundation projection is conditioned on four empirical Rwandan macroeconomic transmission curves:
1. **Currency Pass-Through ($\tau_{\text{FX}} = 30\text{--}60\text{ days}$)**:
   $$w_{\text{FX}}(h) = \begin{cases} 0.5 \cdot \Delta_{\text{FX}}, & h = 1 \\ 0.9 \cdot \Delta_{\text{FX}}, & h = 2 \\ \max(0, 0.9 - (h-2)\cdot 0.18)\cdot \Delta_{\text{FX}}, & h > 2 \end{cases}$$
2. **Climate / Precipitation Deficit ($\tau_{\text{Rain}} = 60\text{--}90\text{ days}$)**:
   $$w_{\text{Rain}}(h) = \begin{cases} 0.4 \cdot h \cdot \Delta_{\text{RainDeficit}}, & h \le 2 \\ \max(0, 1.1 - (h-2)\cdot 0.22)\cdot \Delta_{\text{RainDeficit}}, & h > 2 \end{cases}$$
3. **Brent Crude Pass-Through ($\tau_{\text{Fuel}} = 15\text{--}30\text{ days}$)**:
   $$w_{\text{Fuel}}(h) = \max(0, 1.0 - h \cdot 0.3) \cdot 0.7 \cdot \Delta_{\text{Brent}}$$
4. **Central Bank Rate Transmission ($\tau_{\text{CBR}} = 90\text{--}180\text{ days}$)**:
   $$w_{\text{CBR}}(h) = \min(0.40, 0.05 + h \cdot 0.08) \cdot (-0.40) \cdot \Delta_{\text{CBR}}$$

#### 3.4 Probabilistic Quantile Fan Corridor Formulation
For each forward step $h \in [1, H]$, TimesFM outputs a full predictive probability distribution decomposed into quantile heads:
$$\hat{q}_\alpha(h) = \hat{\mu}_h + z_\alpha \cdot \sigma_0 \cdot \sqrt{h}$$
* $\hat{q}_{50}$: Median point forecast
* $\hat{q}_{25}, \hat{q}_{75}$: $50\%$ Confidence Fan Corridor ($z = \pm 0.67$)
* $\hat{q}_{10}, \hat{q}_{90}$: $80\%$ Confidence Fan Corridor ($z = \pm 1.28$)
* $\hat{q}_{05}, \hat{q}_{95}$: $95\%$ Confidence Fan Corridor ($z = \pm 1.64$)

#### 3.5 BNR Corridor Breach Metric
$$\text{BreachRisk}(H) = \frac{1}{H} \sum_{h=1}^H \mathbb{I}\left(\hat{q}_{90}(h) > 8.0\% \;\lor\; \hat{q}_{10}(h) < 2.0\%\right) \times 100\%$$

---

### 4. Econometric Transmission Lag Model

Rwanda's price dynamics exhibit pronounced structural transmission lags due to its landlocked geography, two-season agricultural calendar, and import transit dependencies:

| Shock Channel | Primary Source | Transmission Mechanism | Empirical Lag | Headline Impact | Urban Impact | Rural Impact |
|---|---|---|---|---|---|---|
| **Currency Depreciation** | BNR / FX Interbank | USD/RWF depreciation raises import costs of fuel, edible oil, and machinery at Mombasa/Dar | **30–60 Days** | $+0.90\%$ per $+10\%$ FX | $+1.30\%$ | $+0.60\%$ |
| **Rainfall Anomaly** | Meteo Rwanda / Rab | Eastern Province dry spell impacts Season A/B bean & maize grain yields at harvest | **60–90 Days** | $+1.10\%$ per $-10\%$ rain | $+0.70\%$ | $+1.60\%$ |
| **Global Brent Crude** | Platts / Reuters | Global crude moves Dar es Salaam freight tariffs and RURA monthly pump price caps | **15–30 Days** | $+0.70\%$ per $+10\%$ Brent | $+0.90\%$ | $+0.50\%$ |
| **CBR Policy Rate** | BNR MPC | CBR interest rate hike dampens commercial bank private credit and money velocity | **90–180 Days** | $-0.40\%$ per $+100\text{ bps}$ | $-0.40\%$ | $-0.40\%$ |

---

### 5. Data Pipeline & Ingestion Architecture

The automated data pipeline executes across 5 sequential stages:

```
[Stage 1: Multi-Source Harvester]
  ├── Ingests NISR CPI tables, BNR daily FX bulletins, MINAGRI e-Soko wholesale lists, Meteo matrices.
  └── Verifies connectivity, records schema signatures, logs ingestion latency (~18ms).

[Stage 2: Cleaning & Imputation]
  ├── Validates ISO-8601 month strings and numerical bounds (-5.0% to +50.0%).
  ├── Imputes missing rural market observations via Kalman smoothing.
  └── Rebases all index series to February 2014 = 100.

[Stage 3: Distributed Lag Tensor Construction]
  ├── Constructs polynomial lag matrices (t-1, t-2, t-3) for FX, Climate, and Fuel.
  └── Engineers 96 input features for multivariate foundation projection.

[Stage 4: TimesFM Tokenizer & Tensor Packing]
  ├── Tokenizes historical sequence into continuous 32-element patch representations.
  └── Enforces temporal frequency marker 'M' (Monthly).

[Stage 5: TimesFM Quantile Inference & BNR Fan Chart]
  ├── Computes multi-horizon autoregressive point forecasts and 50/80/95% quantiles.
  └── Calibrates bounds against BNR 2.0% floor and 8.0% ceiling.
```

---

### 6. REST API Specification

#### 6.1 `GET /api/indicators`
* **Description**: Retrieves the complete real-time macroeconomic state across all four clusters.
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "metadata": { "country": "Rwanda", "lastUpdated": "October 2026", "bnrTargetBand": { "lower": 2.0, "target": 5.0, "upper": 8.0 } },
    "clusterA_officialDomestic": { ... },
    "clusterB_regionalTradeAndFuel": { ... },
    "clusterC_climateAndMeteo": { ... },
    "clusterD_microMarketSignals": { ... }
  }
}
```

#### 6.2 `POST /api/timesfm/predict`
* **Description**: Runs Google TimesFM 2.0 zero-shot multi-horizon forecast.
* **Request Body**:
```json
{
  "horizonSteps": 12,
  "adjustments": {
    "usdRwfChangePct": 5.0,
    "rainfallAnomalyPct": -10.0,
    "brentCrudeChangePct": 8.0,
    "cbrRateChangeBps": 50
  }
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "points": [
      {
        "month": "Nov 2025",
        "mean": 5.24,
        "median": 5.24,
        "urbanMean": 4.89,
        "ruralMean": 5.58,
        "q05": 4.78,
        "q10": 4.88,
        "q25": 5.05,
        "q75": 5.43,
        "q90": 5.60,
        "q95": 5.70,
        "isForecast": true
      }
    ],
    "modelCard": { "name": "Google TimesFM (Time-series Foundation Model)", "zeroShotMape": 3.42 },
    "summary": { "peakInflationMonth": "Nov 2025", "peakInflationVal": 5.24, "corridorBreachRiskPct": 0 }
  }
}
```

#### 6.3 `POST /api/pipeline/ingest`
* **Description**: Ingests new monthly observations, appends to `cpiHistory`, updates macro state, and triggers auto-reforecasting.
* **Request Body**:
```json
{
  "month": "Nov 2026",
  "headlineCPI": 5.3,
  "urbanCPI": 4.9,
  "ruralCPI": 5.6,
  "usdRwf": 1395.0,
  "brentCrudeUSD": 80.5,
  "cbrRate": 6.50
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Successfully ingested and synchronized 5 data signals. TimesFM fan chart and econometric indicators recalibrated.",
  "updatedState": { ... },
  "timesfm": { ... },
  "econometrics": { ... }
}
```

#### 6.4 `POST /api/pipeline/ingest-csv`
* **Description**: Ingests multiple historical observations via raw CSV text.
* **Request Body**:
```json
{
  "csvText": "month,headline,urban,rural,usdRwf,brentCrude\nNov 2026,5.3,4.9,5.6,1395,80.5\nDec 2026,5.1,4.7,5.4,1398,79.2"
}
```

#### 6.5 `POST /api/pipeline/reset`
* **Description**: Resets the active surveillance dataset back to the official October 2026 baseline.

#### 6.6 `GET /api/pipeline/export-python`
* **Description**: Downloads the complete, standalone Python pipeline script (`rwanda_timesfm_pipeline.py`) for Airflow, Vertex AI, or local Python execution.

---

### 7. Edge Cases, Fail-Safes & Validation Rules

1. **Out-of-Bounds CPI Inputs**:
   * If an ingested headline CPI is $< -5.0\%$ or $> 50.0\%$, the ingestion engine records a non-fatal validation warning and logs the observation as an outlier without crashing.
2. **Missing Component Breakdown**:
   * If a user uploads Headline CPI without Urban and Rural breakdowns, the engine applies Rwanda's official demographic consumption split:
     $$\text{Urban} = 0.95 \cdot \text{Headline}, \quad \text{Rural} = 1.05 \cdot \text{Headline}$$
3. **Date Sequence Continuity**:
   * Ingesting arbitrary month strings (e.g., "Nov 2026", "2027-01") automatically triggers dynamic month incrementation so forward forecast horizon labels always maintain monotonic chronological order.
4. **Gemini AI Service Resilience**:
   * If the external Gemini API is temporarily unreachable or experiences rate limits, the system seamlessly activates the local Econometric Policy Engine fallback, guaranteeing uninterrupted zero-downtime surveillance.
5. **Zero Division & Clamping**:
   * All statistical spreads, standard deviations, and percentage changes incorporate $\epsilon = 10^{-6}$ safeguards to prevent `NaN` or `Infinity` propagation into the UI or SVG chart components.

---

*Authored by the Macroeconomic Intelligence Engineering Team for the Republic of Rwanda.*
