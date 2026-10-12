import React, { useState } from 'react';
import { MacroData } from '../types';
import { Building2, Landmark, Sprout, Truck, CloudRain, Flame, Fuel, Activity, ChevronRight, Scale, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  data: MacroData;
}

export const DataClustersView: React.FC<Props> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const {
    clusterA_officialDomestic: a,
    clusterB_regionalTradeAndFuel: b,
    clusterC_climateAndMeteo: c,
    clusterD_microMarketSignals: d
  } = data;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white">
            4-Cluster Macroeconomic Data Ingestion Engine
          </h3>
          <p className="text-xs text-slate-400">
            Real-time feeds from NISR, National Bank of Rwanda (BNR), MINAGRI, Meteo Rwanda & EAC Corridors
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('A')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'A' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cluster A: Official Domestic
          </button>
          <button
            onClick={() => setActiveTab('B')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'B' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cluster B: EAC & Fuel
          </button>
          <button
            onClick={() => setActiveTab('C')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'C' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cluster C: Climate & Meteo
          </button>
          <button
            onClick={() => setActiveTab('D')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'D' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cluster D: Micro & Utilities
          </button>
        </div>
      </div>

      <div className="mt-4">
        {/* CLUSTER A */}
        {activeTab === 'A' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NISR Panel */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">NISR Official Data</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Statistics Rwanda</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Headline CPI (YoY)</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">{a.nisr.headlineCPI}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Urban CPI (25.8% food)</span>
                    <span className="font-mono text-sky-400 font-semibold">{a.nisr.urbanCPI}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Rural CPI (46.2% food)</span>
                    <span className="font-mono text-amber-400 font-semibold">{a.nisr.ruralCPI}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Producer Price Index (PPI)</span>
                    <span className="font-mono text-slate-200">+{a.nisr.ppiAnnualChange}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Real GDP Growth ({a.nisr.gdpQuarter})</span>
                    <span className="font-mono text-emerald-300 font-bold">+{a.nisr.gdpGrowthYoY}%</span>
                  </div>
                </div>
              </div>

              {/* BNR Panel */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">National Bank (BNR)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Central Bank Rate</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Central Bank Rate (CBR)</span>
                    <span className="font-mono text-blue-400 font-bold text-sm">{a.bnr.cbrRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Commercial Lending Rate</span>
                    <span className="font-mono text-slate-300">{a.bnr.lendingRateAvg}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">M2 / M3 Money Supply Growth</span>
                    <span className="font-mono text-slate-300">+{a.bnr.m2GrowthYoY}% / +{a.bnr.m3GrowthYoY}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">USD / RWF Official FX</span>
                    <span className="font-mono text-purple-300 font-semibold">{a.bnr.exchangeRates.usdRwf.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">EUR / RWF Official FX</span>
                    <span className="font-mono text-slate-300">{a.bnr.exchangeRates.eurRwf.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* MINAGRI Panel */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">MINAGRI Yields</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{a.minagri.currentSeason}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-900">
                    <span className="text-slate-400">Season A Yield Estimate</span>
                    <span className="font-mono text-emerald-400 font-semibold">{a.minagri.seasonAYieldEstimate}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 p-2 rounded bg-slate-900/80 border border-slate-800/60">
                    <span className="text-slate-400 block mb-0.5">Soil Moisture Status:</span>
                    {a.minagri.soilMoistureIndex}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Key Granary Regions: Musanze, Nyabihu, Nyagatare, Kirehe, Huye.
                  </div>
                </div>
              </div>
            </div>

            {/* MINAGRI Staple Food Market Prices Table */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  MINAGRI Domestic Food Market Price Tracker (RWF / kg)
                </span>
                <span className="text-[11px] text-slate-400">Crucial for Rural CPI (46.2% weight)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="pb-2">Commodity Crop</th>
                      <th className="pb-2">Price (RWF/kg)</th>
                      <th className="pb-2">30-Day Change</th>
                      <th className="pb-2">Market & Supply Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {a.minagri.staplePrices.map((crop, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-2.5 font-semibold text-slate-200">{crop.crop}</td>
                        <td className="py-2.5 font-mono text-emerald-400 font-bold">{crop.priceRwfKg} RWF</td>
                        <td className="py-2.5 font-mono">
                          <span className={`inline-flex items-center gap-1 ${
                            crop.changeMonth < 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {crop.changeMonth < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                            {crop.changeMonth}%
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 text-[11px]">{crop.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CLUSTER B */}
        {activeTab === 'B' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* EAC Trade Corridors */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">EAC Trade Cross-Border Logistics</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Northern & Central Corridors</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-200">Uganda Corridor (Gatuna / Cyanika)</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                        Vol: {b.eacTrade.ugandaFlows.volumeChange}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{b.eacTrade.ugandaFlows.keyItems}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-200">Tanzania Corridor (Rusumo / Dar Port)</span>
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[11px]">
                        Vol: {b.eacTrade.tanzaniaFlows.volumeChange}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{b.eacTrade.tanzaniaFlows.keyItems}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-200">Kenya Corridor (Mombasa Port Transit)</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px]">
                        Vol: {b.eacTrade.kenyaFlows.volumeChange}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{b.eacTrade.kenyaFlows.keyItems}</p>
                  </div>
                </div>
              </div>

              {/* Fuel & Global Commodities */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Fuel & Freight Tariffs</span>
                  </div>
                  <span className="text-[10px] text-slate-500">15–30 Day Lag Transmission</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Global Brent Crude</span>
                    <span className="font-mono text-amber-400 font-bold text-sm">${b.fuelAndLogistics.brentCrudeUSD} / bbl</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Kigali Regulated Petrol (Super)</span>
                    <span className="font-mono text-slate-200 font-semibold">{b.fuelAndLogistics.kigaliPetrolPumpPriceRwf} RWF / L</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Kigali Regulated Diesel</span>
                    <span className="font-mono text-slate-200 font-semibold">{b.fuelAndLogistics.kigaliDieselPumpPriceRwf} RWF / L</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Dar es Salaam to Kigali 40ft Freight</span>
                    <span className="font-mono text-sky-400 font-semibold">${b.fuelAndLogistics.freightTariffDarToKigaliUSD}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">Average Transit Turnaround</span>
                    <span className="font-mono text-slate-300">{b.fuelAndLogistics.freightTransitDays} Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLUSTER C */}
        {activeTab === 'C' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Meteo Rwanda Climate & Precipitation Signals (60–90 Day Lag to CPI)
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-medium">
                  National Risk Score: {c.nationalClimateRiskScore}/10 (Moderate-Safe)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {c.meteoRwandaSignals.map((signal, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-200 text-xs">{signal.province}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                        signal.risk === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {signal.risk} Risk ({signal.anomalyPercent})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{signal.condition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CLUSTER D */}
        {activeTab === 'D' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fertilizer & Inputs */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Agricultural Inputs & Subsidies</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Smart Nkunganire (SNAS)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Subsidized DAP Fertilizer</span>
                    <span className="font-mono text-emerald-400 font-bold">{d.fertilizerSubsidies.dapPriceRwfKg} RWF / kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Subsidized Urea Fertilizer</span>
                    <span className="font-mono text-emerald-400 font-bold">{d.fertilizerSubsidies.ureaPriceRwfKg} RWF / kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">Cross-Border Trade Index</span>
                    <span className="font-mono text-slate-200">{d.crossBorderTradeIndex} (Base 100)</span>
                  </div>
                </div>
              </div>

              {/* RURA Utilities */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">RURA Administered Utility Tariffs</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Regulated Basket (REG/WASAC)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Residential Electricity (REG)</span>
                    <span className="font-mono text-slate-200 font-semibold">{d.utilitiesRURA.electricityResidentialRwfKWh} RWF / kWh</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Residential Water (WASAC)</span>
                    <span className="font-mono text-slate-200 font-semibold">{d.utilitiesRURA.waterResidentialRwfM3} RWF / m³</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="text-slate-400">Domestic Cooking Gas (LPG)</span>
                    <span className="font-mono text-amber-400 font-semibold">{d.utilitiesRURA.cookingGasLpgRwfKg} RWF / kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">Kigali Public Bus Regulated Fare</span>
                    <span className="font-mono text-slate-200 font-semibold">{d.utilitiesRURA.publicTransportFareRwfKm} RWF / km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
