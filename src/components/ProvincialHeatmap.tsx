import React, { useState } from 'react';
import { MapPin, Sprout, AlertTriangle, ShieldCheck, ThermometerSun, Truck, ArrowRight } from 'lucide-react';

interface ProvinceDetail {
  id: string;
  name: string;
  capital: string;
  vulnerability: 'Low' | 'Medium' | 'High';
  keyCrops: string[];
  climateStatus: string;
  cpiVulnerabilityNote: string;
  primaryRiskDriver: string;
  urbanRuralProfile: string;
  foodInflationExposure: string;
}

const PROVINCES: ProvinceDetail[] = [
  {
    id: 'kigali',
    name: 'City of Kigali',
    capital: 'Kigali (Gasabo, Kicukiro, Nyarugenge)',
    vulnerability: 'Medium',
    keyCrops: ['Urban Consumer Market', 'Perishables Logistics'],
    climateStatus: 'Urban Microclimate (Normal precipitation)',
    cpiVulnerabilityNote: 'Dominated by housing rental indexes, public bus transit fares, and retail imported commodities.',
    primaryRiskDriver: 'Imported Goods & Transport Fares',
    urbanRuralProfile: '100% Urban CPI Weighting',
    foodInflationExposure: 'Low direct farm exposure, high logistics pass-through'
  },
  {
    id: 'eastern',
    name: 'Eastern Province',
    capital: 'Rwamagana (Nyagatare, Kayonza, Kirehe, Bugesera)',
    vulnerability: 'High',
    keyCrops: ['Maize', 'Dry Beans', 'Bananas', 'Livestock / Dairy'],
    climateStatus: 'Dry Spell Alert: -14% Precipitation Anomaly',
    cpiVulnerabilityNote: 'Critical national granary. Soil moisture deficit during Season A germination threatens bean and maize wholesale supply.',
    primaryRiskDriver: 'Climate & Rainfall Deficit (Season A)',
    urbanRuralProfile: '85% Rural CPI Weighting',
    foodInflationExposure: 'Very High (Staple grain pricing benchmark for entire country)'
  },
  {
    id: 'northern',
    name: 'Northern Province',
    capital: 'Musanze (Burera, Gicumbi, Rulindo)',
    vulnerability: 'Low',
    keyCrops: ['Irish Potatoes (Kinigi)', 'Vegetables', 'Wheat', 'Pyrethrum'],
    climateStatus: 'Favorable Rainfall (+8% vs 10-year mean)',
    cpiVulnerabilityNote: 'Strong potato harvests from volcanic soils in Musanze/Burera are currently suppressing national tuber inflation.',
    primaryRiskDriver: 'Fertilizer Input Pricing (DAP / Urea)',
    urbanRuralProfile: '78% Rural CPI Weighting',
    foodInflationExposure: 'Strong Supply Buffer'
  },
  {
    id: 'western',
    name: 'Western Province',
    capital: 'Karongi (Rubavu, Rusizi, Nyabihu, Rutsiro)',
    vulnerability: 'Low',
    keyCrops: ['Tea', 'Coffee', 'Irish Potatoes', 'Fishing (Lake Kivu)'],
    climateStatus: 'Adequate Moisture (+4% Anomaly)',
    cpiVulnerabilityNote: 'Rubavu and Rusizi borders support dynamic cross-border informal and formal food trade with eastern DRC.',
    primaryRiskDriver: 'Cross-Border DRC Trade Arbitrage',
    urbanRuralProfile: '82% Rural CPI Weighting',
    foodInflationExposure: 'Moderate (Cushioned by cash crop incomes)'
  },
  {
    id: 'southern',
    name: 'Southern Province',
    capital: 'Nyanza (Huye, Muhanga, Ruhango, Gisagara)',
    vulnerability: 'Low',
    keyCrops: ['Cassava Flour', 'Sweet Potatoes', 'Legumes', 'Coffee'],
    climateStatus: 'Normal Seasonal Conditions (-2% Anomaly)',
    cpiVulnerabilityNote: 'Steady supplies of cassava root and flour from Gisagara and Nyanza maintain affordable calorie baseline.',
    primaryRiskDriver: 'Cassava Brown Streak Disease monitoring',
    urbanRuralProfile: '88% Rural CPI Weighting',
    foodInflationExposure: 'Low-Moderate (Resilient root crop base)'
  }
];

export const ProvincialHeatmap: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('eastern');

  const selectedProvince = PROVINCES.find(p => p.id === selectedId) || PROVINCES[0];

  const getVulnerabilityBadge = (vuln: 'Low' | 'Medium' | 'High') => {
    switch (vuln) {
      case 'High':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white">
            Provincial CPI Vulnerability & Agriculture granary matrix
          </h3>
          <p className="text-xs text-slate-400">
            Localized price transmission risk across Rwanda's 5 provinces and key agricultural corridors
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> High Risk
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Medium Risk
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low Risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Province list / selector */}
        <div className="lg:col-span-5 space-y-2">
          {PROVINCES.map((prov) => {
            const isSelected = prov.id === selectedId;
            return (
              <button
                key={prov.id}
                onClick={() => setSelectedId(prov.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{prov.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${getVulnerabilityBadge(prov.vulnerability)}`}>
                      {prov.vulnerability} Risk
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[240px]">
                    {prov.primaryRiskDriver}
                  </div>
                </div>

                <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-emerald-400 translate-x-1' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Selected Province Detailed Intelligence */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{selectedProvince.name}</h4>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getVulnerabilityBadge(selectedProvince.vulnerability)}`}>
                Vulnerability: {selectedProvince.vulnerability}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-3 text-xs">
              <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/60">
                <span className="text-slate-400 block text-[11px]">Primary Granary Districts</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{selectedProvince.capital}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/60">
                <span className="text-slate-400 block text-[11px]">Precipitation / Climate</span>
                <span className="font-semibold text-emerald-400 mt-0.5 block">{selectedProvince.climateStatus}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block mb-1">
                  Key Staple Crops & Economic Profile
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProvince.keyCrops.map((crop, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono text-[11px]">
                      {crop}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block mb-1">
                  CPI Inflation Mechanism & Exposure Note
                </span>
                <p className="text-slate-200 text-xs leading-relaxed bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
                  {selectedProvince.cpiVulnerabilityNote}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                  <span className="text-slate-400 block">Urban/Rural Profile:</span>
                  <span className="font-mono text-slate-200">{selectedProvince.urbanRuralProfile}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                  <span className="text-slate-400 block">Primary Risk Factor:</span>
                  <span className="font-mono text-rose-300 font-medium">{selectedProvince.primaryRiskDriver}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Aggregated into NISR National Composite Index</span>
            <span className="text-emerald-400 font-mono">Weight in Headline: ~20%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
