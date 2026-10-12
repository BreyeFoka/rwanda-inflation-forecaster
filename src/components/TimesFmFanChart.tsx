import React, { useState } from 'react';
import { TimesFmResult, BnrTargetBand } from '../types';
import {
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Info,
  Calendar,
  Sparkles,
  Sliders
} from 'lucide-react';

interface Props {
  timesFmData: TimesFmResult;
  bnrBand: BnrTargetBand;
  onHorizonChange?: (horizon: number) => void;
  selectedHorizon?: number;
}

export const TimesFmFanChart: React.FC<Props> = ({
  timesFmData,
  bnrBand,
  onHorizonChange,
  selectedHorizon = 12
}) => {
  const [showUrban, setShowUrban] = useState(true);
  const [showRural, setShowRural] = useState(true);
  const [showFanBands, setShowFanBands] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const { points, modelCard, summary } = timesFmData;

  // Chart dimensions
  const width = 860;
  const height = 340;
  const padding = { top: 35, right: 45, bottom: 45, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minVal = 0.0;
  const maxVal = 10.5;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + innerHeight - ((clamped - minVal) / (maxVal - minVal)) * innerHeight;
  };

  const getX = (index: number) => {
    return padding.left + (index / (points.length - 1)) * innerWidth;
  };

  const yLower = getY(bnrBand.lower);
  const yTarget = getY(bnrBand.target);
  const yUpper = getY(bnrBand.upper);

  // Divide historical vs forecast
  const historicalIndices = points.map((p, i) => (!p.isForecast ? i : -1)).filter(i => i !== -1);
  const forecastIndices = points.map((p, i) => (p.isForecast ? i : -1)).filter(i => i !== -1);

  // Connection point between historical and forecast
  const lastHistIdx = historicalIndices[historicalIndices.length - 1];
  const firstFcIdx = forecastIndices[0];

  // Fan Chart Area paths for forecast steps
  // 95% band area (q05 to q95)
  const fcPoints = points.slice(lastHistIdx);
  const getFanPath = (upperKey: string, lowerKey: string) => {
    const topPoints = fcPoints.map((p, i) => `${getX(lastHistIdx + i)},${getY((p as any)[upperKey])}`);
    const bottomPoints = fcPoints.map((p, i) => `${getX(lastHistIdx + i)},${getY((p as any)[lowerKey])}`).reverse();
    return `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
  };

  const area95 = getFanPath('q95', 'q05');
  const area80 = getFanPath('q90', 'q10');
  const area50 = getFanPath('q75', 'q25');

  // Historical path
  const histHeadlinePath = historicalIndices.map(i => `${getX(i)},${getY(points[i].mean)}`).join(' L ');
  // Forecast mean path
  const fcHeadlinePath = [lastHistIdx, ...forecastIndices].map(i => `${getX(i)},${getY(points[i].mean)}`).join(' L ');
  // Urban and Rural forecast paths
  const urbanPath = points.map((p, i) => `${getX(i)},${getY(p.urbanMean)}`).join(' L ');
  const ruralPath = points.map((p, i) => `${getX(i)},${getY(p.ruralMean)}`).join(' L ');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Google TimesFM 2.0 Central Bank Fan Chart Forecast
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                Foundation Model Zero-Shot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-horizon autoregressive projection with 50%, 80%, and 95% confidence intervals against BNR target band (2%–8%)
            </p>
          </div>
        </div>

        {/* Horizon selector chips & Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-slate-400">
            <span className="text-[11px] mr-1">Horizon:</span>
            {[6, 12].map(h => (
              <button
                key={h}
                onClick={() => onHorizonChange?.(h)}
                className={`px-2 py-0.5 rounded font-mono font-semibold transition-colors ${
                  selectedHorizon === h
                    ? 'bg-sky-500 text-slate-950'
                    : 'hover:text-slate-200'
                }`}
              >
                {h}M
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFanBands(!showFanBands)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              showFanBands
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            Fan Bands (50/80/95%)
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Peak Forecasted Inflation</span>
          <div className="font-mono text-base font-bold text-sky-400 mt-0.5">
            {summary.peakInflationVal}%
            <span className="text-xs text-slate-400 font-normal ml-1.5">({summary.peakInflationMonth})</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">BNR Corridor Breach Risk</span>
          <div className="font-mono text-base font-bold mt-0.5 flex items-center gap-1.5">
            <span className={summary.corridorBreachRiskPct > 20 ? 'text-amber-400' : 'text-emerald-400'}>
              {summary.corridorBreachRiskPct}%
            </span>
            <span className="text-[10px] text-slate-500 font-normal">(Exceeds 8% / Sub 2%)</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Urban vs. Rural Spread Max</span>
          <div className="font-mono text-base font-bold text-amber-300 mt-0.5">
            ±{summary.urbanRuralSpreadMax}%
            <span className="text-[10px] text-slate-500 font-normal ml-1">46.2% Rural Food Weight</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">TimesFM Zero-Shot MAPE</span>
          <div className="font-mono text-base font-bold text-emerald-400 mt-0.5">
            {modelCard.zeroShotMape}%
            <span className="text-[10px] text-slate-500 font-normal ml-1">Patch Length: 32</span>
          </div>
        </div>
      </div>

      {/* SVG Fan Chart Visualizer */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-72 md:h-80 select-none"
        >
          <defs>
            {/* Shaded BNR target corridor gradient */}
            <linearGradient id="bnrTargetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.14" />
            </linearGradient>

            {/* TimesFM 95% Outer Fan gradient */}
            <linearGradient id="fan95Grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.14" />
            </linearGradient>

            {/* TimesFM 80% Middle Fan gradient */}
            <linearGradient id="fan80Grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.25" />
            </linearGradient>

            {/* TimesFM 50% Inner Core Fan gradient */}
            <linearGradient id="fan50Grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.38" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          {[2, 4, 5, 6, 8, 10].map(val => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray={val === 5 ? "4 4" : undefined}
              />
              <text
                x={padding.left - 8}
                y={getY(val) + 3}
                fill={val === 5 ? '#10b981' : '#64748b'}
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
                fontWeight={val === 5 ? "bold" : "normal"}
              >
                {val}%
              </text>
            </g>
          ))}

          {/* BNR Target Band Area (2.0% - 8.0%) */}
          <rect
            x={padding.left}
            y={yUpper}
            width={innerWidth}
            height={yLower - yUpper}
            fill="url(#bnrTargetGradient)"
          />

          {/* Upper bound line (8%) */}
          <line
            x1={padding.left}
            y1={yUpper}
            x2={width - padding.right}
            y2={yUpper}
            stroke="#10b981"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <text
            x={width - padding.right - 4}
            y={yUpper - 4}
            fill="#10b981"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
            opacity="0.8"
          >
            BNR Ceiling (8.0%)
          </text>

          {/* Mid target line (5%) */}
          <line
            x1={padding.left}
            y1={yTarget}
            x2={width - padding.right}
            y2={yTarget}
            stroke="#10b981"
            strokeWidth="1.6"
            strokeDasharray="6 3"
          />
          <text
            x={width - padding.right - 4}
            y={yTarget - 4}
            fill="#34d399"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="end"
          >
            BNR Target Benchmark (5.0%)
          </text>

          {/* Lower bound line (2%) */}
          <line
            x1={padding.left}
            y1={yLower}
            x2={width - padding.right}
            y2={yLower}
            stroke="#10b981"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <text
            x={width - padding.right - 4}
            y={yLower + 12}
            fill="#10b981"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
            opacity="0.8"
          >
            BNR Floor (2.0%)
          </text>

          {/* Forecast Area Divider */}
          <line
            x1={getX(lastHistIdx)}
            y1={padding.top}
            x2={getX(lastHistIdx)}
            y2={height - padding.bottom}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <text
            x={getX(lastHistIdx) + 5}
            y={padding.top + 12}
            fill="#38bdf8"
            fontSize="9.5"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            TimesFM Forecast Start ➔
          </text>

          {/* Shaded Fan Bands (Only for forecast horizon) */}
          {showFanBands && (
            <>
              {/* 95% Confidence Corridor (p05 - p95) */}
              <path d={area95} fill="url(#fan95Grad)" />
              {/* 80% Confidence Corridor (p10 - p90) */}
              <path d={area80} fill="url(#fan80Grad)" />
              {/* 50% Confidence Corridor (p25 - p75) */}
              <path d={area50} fill="url(#fan50Grad)" />
            </>
          )}

          {/* Urban & Rural Trajectories */}
          {showRural && (
            <path
              d={`M ${ruralPath}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeOpacity="0.75"
              strokeDasharray="3 3"
            />
          )}

          {showUrban && (
            <path
              d={`M ${urbanPath}`}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeOpacity="0.75"
              strokeDasharray="3 3"
            />
          )}

          {/* Historical Headline Line */}
          <path
            d={`M ${histHeadlinePath}`}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Forecast Central Path (TimesFM Mean/Median) */}
          <path
            d={`M ${fcHeadlinePath}`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />

          {/* X Axis Tick Labels */}
          {points.map((p, i) => {
            // Show every 2nd label on small screens
            const isEverySecond = i % 2 === 0 || i === points.length - 1;
            return (
              <g key={i}>
                <line
                  x1={getX(i)}
                  y1={height - padding.bottom}
                  x2={getX(i)}
                  y2={height - padding.bottom + 4}
                  stroke="#334155"
                />
                {isEverySecond && (
                  <text
                    x={getX(i)}
                    y={height - padding.bottom + 16}
                    fill={p.isForecast ? '#38bdf8' : '#94a3b8'}
                    fontSize="9"
                    fontFamily="sans-serif"
                    fontWeight={p.isForecast ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {p.month}
                  </text>
                )}
              </g>
            );
          })}

          {/* Interactive Hover Dots */}
          {points.map((p, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint({ ...p, x: getX(i), y: getY(p.mean) })}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <rect
                x={getX(i) - 12}
                y={padding.top}
                width={24}
                height={innerHeight}
                fill="transparent"
              />
              <circle
                cx={getX(i)}
                cy={getY(p.mean)}
                r={p.isForecast ? 4 : 3.5}
                fill={p.isForecast ? '#38bdf8' : '#10b981'}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Hover Crosshair line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={height - padding.bottom}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.5"
            />
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-20 rounded-xl bg-slate-900/95 border border-slate-700 p-3 text-xs shadow-2xl text-slate-100 max-w-xs"
            style={{
              left: Math.min(hoveredPoint.x + 12, width - 220),
              top: Math.max(15, hoveredPoint.y - 75)
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
              <span>{hoveredPoint.month}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                hoveredPoint.isForecast ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {hoveredPoint.isForecast ? 'TimesFM Forecast' : 'Historical Actual'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between gap-4 text-emerald-400">
                <span>Headline (p50):</span>
                <span className="font-bold">{hoveredPoint.mean}%</span>
              </div>
              {hoveredPoint.isForecast && (
                <>
                  <div className="flex justify-between gap-4 text-sky-300">
                    <span>50% Band (p25–p75):</span>
                    <span>{hoveredPoint.q25}% – {hoveredPoint.q75}%</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sky-400">
                    <span>80% Band (p10–p90):</span>
                    <span>{hoveredPoint.q10}% – {hoveredPoint.q90}%</span>
                  </div>
                  <div className="flex justify-between gap-4 text-slate-400">
                    <span>95% Band (p05–p95):</span>
                    <span>{hoveredPoint.q05}% – {hoveredPoint.q95}%</span>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-4 text-sky-400 pt-1 border-t border-slate-800">
                <span>Urban Projection:</span>
                <span>{hoveredPoint.urbanMean}%</span>
              </div>
              <div className="flex justify-between gap-4 text-amber-400">
                <span>Rural Projection:</span>
                <span>{hoveredPoint.ruralMean}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-1 bg-emerald-400 rounded"></span> Historical NISR Actual
          </span>
          <span className="flex items-center gap-1.5 text-sky-300">
            <span className="w-3 h-1 border-b-2 border-dashed border-sky-400"></span> TimesFM Central Projection
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-2 bg-sky-500/30 rounded"></span> Central Bank Fan Bands (50/80/95%)
          </span>
          <button
            onClick={() => setShowUrban(!showUrban)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              showUrban ? 'bg-sky-500/10 text-sky-300' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span> Urban CPI
          </button>
          <button
            onClick={() => setShowRural(!showRural)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              showRural ? 'bg-amber-500/10 text-amber-300' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Rural CPI (46.2% Food)
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Model: {modelCard.name} • Version {modelCard.version}</span>
        </div>
      </div>
    </div>
  );
};
