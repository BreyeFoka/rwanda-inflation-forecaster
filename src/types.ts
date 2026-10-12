export interface BnrTargetBand {
  lower: number;
  target: number;
  upper: number;
  unit: string;
}

export interface CpiHistoryPoint {
  month: string;
  headline: number;
  urban: number;
  rural: number;
}

export interface StapleCropPrice {
  crop: string;
  priceRwfKg: number;
  changeMonth: number;
  note: string;
}

export interface MeteoSignal {
  province: string;
  condition: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  anomalyPercent: string;
}

export interface MacroData {
  metadata: {
    country: string;
    currency: string;
    baseYear: string;
    lastUpdated: string;
    bnrTargetBand: BnrTargetBand;
  };
  clusterA_officialDomestic: {
    nisr: {
      headlineCPI: number;
      urbanCPI: number;
      ruralCPI: number;
      urbanWeightFood: number;
      ruralWeightFood: number;
      ppiAnnualChange: number;
      gdpGrowthYoY: number;
      gdpQuarter: string;
      cpiHistory: CpiHistoryPoint[];
    };
    bnr: {
      cbrRate: number;
      cbrChangeYoY: number;
      lendingRateAvg: number;
      depositRateAvg: number;
      m2GrowthYoY: number;
      m3GrowthYoY: number;
      privateSectorCreditGrowth: number;
      exchangeRates: {
        usdRwf: number;
        usdRwfDepreciationYTD: number;
        eurRwf: number;
        kesRwf: number;
        ugxRwf: number;
      };
    };
    minagri: {
      currentSeason: string;
      seasonAYieldEstimate: string;
      soilMoistureIndex: string;
      staplePrices: StapleCropPrice[];
    };
  };
  clusterB_regionalTradeAndFuel: {
    eacTrade: {
      ugandaFlows: { status: string; volumeChange: string; keyItems: string };
      tanzaniaFlows: { status: string; volumeChange: string; keyItems: string };
      kenyaFlows: { status: string; volumeChange: string; keyItems: string };
    };
    fuelAndLogistics: {
      brentCrudeUSD: number;
      brentMonthlyChange: number;
      kigaliPetrolPumpPriceRwf: number;
      kigaliDieselPumpPriceRwf: number;
      freightTariffDarToKigaliUSD: number;
      freightTransitDays: number;
    };
  };
  clusterC_climateAndMeteo: {
    meteoRwandaSignals: MeteoSignal[];
    nationalClimateRiskScore: number;
  };
  clusterD_microMarketSignals: {
    crossBorderTradeIndex: number;
    fertilizerSubsidies: {
      dapPriceRwfKg: number;
      ureaPriceRwfKg: number;
      subsidyScheme: string;
    };
    utilitiesRURA: {
      electricityResidentialRwfKWh: number;
      waterResidentialRwfM3: number;
      cookingGasLpgRwfKg: number;
      publicTransportFareRwfKm: number;
    };
  };
}

export interface TopInflationDriver {
  category: string;
  indicator: string;
  predicted_impact: string;
  lead_time: string;
}

export interface ForecastSummary {
  target_horizon: string;
  projected_cpi_direction: 'Increasing' | 'Stable' | 'Decreasing';
  overall_risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface StructuralBreakdown {
  urban_cpi_impact: string;
  rural_cpi_impact: string;
  imported_vs_local: string;
}

export interface ForecastReport {
  forecast_summary: ForecastSummary;
  top_inflation_drivers: TopInflationDriver[];
  structural_breakdown: StructuralBreakdown;
  policy_and_mitigation_recommendations: string[];
}

export interface EconometricResult {
  baseline: { headline: number; urban: number; rural: number };
  projected: { headline: number; urban: number; rural: number };
  netHeadlineImpact: number;
  direction: 'Increasing' | 'Stable' | 'Decreasing';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  factors: {
    exchangeRate: { impact: number; lag: string; leadTime: string };
    climateRainfall: { impact: number; lag: string; leadTime: string };
    fuelEnergy: { impact: number; lag: string; leadTime: string };
    monetaryPolicy: { impact: number; lag: string; leadTime: string };
  };
}

export interface SimulationAdjustments {
  usdRwfChangePct: number;
  rainfallAnomalyPct: number;
  brentCrudeChangePct: number;
  cbrRateChangeBps: number;
}

// Google TimesFM Foundation Model Forecasting Types
export interface TimesFmForecastPoint {
  month: string;
  mean: number;
  median: number;
  urbanMean: number;
  ruralMean: number;
  q05: number;
  q10: number;
  q25: number;
  q75: number;
  q90: number;
  q95: number;
  isForecast: boolean;
}

export interface TimesFmModelCard {
  name: string;
  version: string;
  architecture: string;
  contextWindow: number;
  horizonSteps: number;
  patchLength: number;
  frequency: string;
  covariatesUsed: string[];
  zeroShotMape: number;
  latencyMs: number;
}

export interface TimesFmResult {
  points: TimesFmForecastPoint[];
  modelCard: TimesFmModelCard;
  summary: {
    peakInflationMonth: string;
    peakInflationVal: number;
    corridorBreachRiskPct: number;
    projectedConvergence: string;
    urbanRuralSpreadMax: number;
  };
}

// Data Pipeline & Ingestion Engine Types
export interface DataPipelineStage {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'warning' | 'failed';
  latencyMs: number;
  recordsProcessed: number;
  description: string;
  details: Record<string, any>;
  logs: string[];
  timestamp: string;
}

export interface DataPipelineRunResult {
  runId: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'warning' | 'error';
  stages: DataPipelineStage[];
  metrics: {
    totalSourcesIngested: number;
    rawRows: number;
    cleanedRows: number;
    lagFeaturesGenerated: number;
    timesFmTokens: number;
  };
  timesfm?: TimesFmResult;
}

export interface IngestedDataBatch {
  source: 'NISR' | 'BNR' | 'MINAGRI' | 'METEO';
  period: string;
  records: Array<{
    indicator: string;
    value: number;
    unit?: string;
    notes?: string;
  }>;
}
