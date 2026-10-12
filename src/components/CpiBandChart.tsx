import React, { useState } from 'react';
import { CpiHistoryPoint, BnrTargetBand } from '../types';
import { TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  history: CpiHistoryPoint[];
  bnrBand: BnrTargetBand;
  forecastHeadline?: number;
  forecastUrban?: number;
  forecastRural?: number;
  horizon?: string;
}

export const CpiBandChart: React.FC<Props> = ({
  history,
  bnrBand,
  forecastHeadline,
  forecastUrban,
  forecastRural,
  horizon = "Next 1–3 Months"
}) => {
  const [activeSeries, setActiveSeries] = useState<{
    headline: boolean;
    urban: boolean;
    rural: boolean;
  }>({
    headline: true,
    urban: true,
    rural: true
  });

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    month: string;
    headline: number;
    urban: number;
    rural: number;
    isForecast?: boolean;
  } | null>(null);

  // Combine history with projected point if available
  const fullData = [...history];
  if (forecastHeadline !== undefined) {
    fullData.push({
      month: 'Forecast',
      headline: forecastHeadline,
      urban: forecastUrban ?? forecastHeadline,
      rural: forecastRural ?? forecastHeadline
    });
  }

  // Chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 40, bottom: 40, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Dynamically calculate scale limits to accommodate shocks or historical peaks without clipping
  const allValues = fullData.flatMap(d => [d.headline, d.urban, d.rural, bnrBand.upper, bnrBand.lower]);
  const minVal = Math.floor(Math.min(0, ...allValues));
  const maxVal = Math.ceil(Math.max(10, ...allValues) + 0.5);

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + innerHeight - ((clamped - minVal) / (maxVal - minVal)) * innerHeight;
  };

  const getX = (index: number) => {
    return padding.left + (index / (fullData.length - 1)) * innerWidth;
  };

  // Coordinates for BNR Target Corridor (2.0% to 8.0%, target 5.0%)
  const yLower = getY(bnrBand.lower);
  const yTarget = getY(bnrBand.target);
  const yUpper = getY(bnrBand.upper);

  // SVG Paths generator
  const createPath = (key: 'headline' | 'urban' | 'rural', isForecastDash = false) => {
    const points = fullData.map((d, i) => `${getX(i)},${getY(d[key])}`);
    return `M ${points.join(' L ')}`;
  };

  // Historic points up to last historical
  const histPointsHeadline = history.map((d, i) => `${getX(i)},${getY(d.headline)}`).join(' L ');
  const histPointsUrban = history.map((d, i) => `${getX(i)},${getY(d.urban)}`).join(' L ');
  const histPointsRural = history.map((d, i) => `${getX(i)},${getY(d.rural)}`).join(' L ');

  // Forecast segment connecting last historical to forecast
  const lastHistIdx = history.length - 1;
  const forecastIdx = fullData.length - 1;
  const hasForecast = forecastHeadline !== undefined;

  const latestPoint = history[history.length - 1];
  const isInBand = latestPoint.headline >= bnrBand.lower && latestPoint.headline <= bnrBand.upper;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-wide">
              Rwanda CPI Inflation Trajectory vs. BNR Target Band
            </h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isInBand ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              {isInBand ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isInBand ? 'Within BNR 2–8% Corridor' : 'Exceeds Target Corridor'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical 12-month NISR Consumer Price Index (Urban vs. Rural) & projected path with Central Bank 5.0% medium-term target
          </p>
        </div>

        {/* Legend / Toggles */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setActiveSeries(s => ({ ...s, headline: !s.headline }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeSeries.headline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800/60 text-slate-400 border border-transparent'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            Headline CPI ({latestPoint.headline}%)
          </button>
          <button
            onClick={() => setActiveSeries(s => ({ ...s, urban: !s.urban }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeSeries.urban ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800/60 text-slate-400 border border-transparent'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            Urban ({latestPoint.urban}%)
          </button>
          <button
            onClick={() => setActiveSeries(s => ({ ...s, rural: !s.rural }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeSeries.rural ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800/60 text-slate-400 border border-transparent'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Rural ({latestPoint.rural}%)
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-64 md:h-72 select-none"
        >
          <defs>
            {/* Shaded BNR target corridor gradient */}
            <linearGradient id="bnrBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.16" />
            </linearGradient>

            <linearGradient id="forecastArea" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis labels */}
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

          {/* BNR Target Band (2.0% to 8.0%) */}
          <rect
            x={padding.left}
            y={yUpper}
            width={innerWidth}
            height={yLower - yUpper}
            fill="url(#bnrBandGradient)"
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
            BNR Upper Ceiling (8%)
          </text>

          {/* Benchmark target line (5%) */}
          <line
            x1={padding.left}
            y1={yTarget}
            x2={width - padding.right}
            y2={yTarget}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={width - padding.right - 4}
            y={yTarget - 4}
            fill="#34d399"
            fontSize="9.5"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="end"
          >
            BNR Benchmark Target (5.0%)
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
            BNR Lower Floor (2%)
          </text>

          {/* Forecast zone background highlight */}
          {hasForecast && (
            <rect
              x={getX(lastHistIdx)}
              y={padding.top}
              width={getX(forecastIdx) - getX(lastHistIdx)}
              height={innerHeight}
              fill="url(#forecastArea)"
            />
          )}

          {/* X Axis labels */}
          {fullData.map((d, i) => (
            <g key={i}>
              <line
                x1={getX(i)}
                y1={height - padding.bottom}
                x2={getX(i)}
                y2={height - padding.bottom + 4}
                stroke="#334155"
              />
              <text
                x={getX(i)}
                y={height - padding.bottom + 16}
                fill={d.month === 'Forecast' ? '#38bdf8' : '#94a3b8'}
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight={d.month === 'Forecast' ? 'bold' : 'normal'}
                textAnchor="middle"
              >
                {d.month}
              </text>
            </g>
          ))}

          {/* Historical Lines */}
          {/* Rural line */}
          {activeSeries.rural && (
            <>
              <path
                d={`M ${histPointsRural}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeOpacity="0.85"
              />
              {hasForecast && (
                <line
                  x1={getX(lastHistIdx)}
                  y1={getY(history[lastHistIdx].rural)}
                  x2={getX(forecastIdx)}
                  y2={getY(forecastRural ?? forecastHeadline!)}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}
            </>
          )}

          {/* Urban line */}
          {activeSeries.urban && (
            <>
              <path
                d={`M ${histPointsUrban}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeOpacity="0.85"
              />
              {hasForecast && (
                <line
                  x1={getX(lastHistIdx)}
                  y1={getY(history[lastHistIdx].urban)}
                  x2={getX(forecastIdx)}
                  y2={getY(forecastUrban ?? forecastHeadline!)}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}
            </>
          )}

          {/* Headline line (prominent) */}
          {activeSeries.headline && (
            <>
              <path
                d={`M ${histPointsHeadline}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {hasForecast && (
                <line
                  x1={getX(lastHistIdx)}
                  y1={getY(history[lastHistIdx].headline)}
                  x2={getX(forecastIdx)}
                  y2={getY(forecastHeadline!)}
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="5 4"
                />
              )}
            </>
          )}

          {/* Data Points */}
          {fullData.map((d, i) => {
            const isForecast = d.month === 'Forecast';
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({
                  x: getX(i),
                  y: getY(d.headline),
                  month: d.month,
                  headline: d.headline,
                  urban: d.urban,
                  rural: d.rural,
                  isForecast
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Invisible hover target */}
                <rect
                  x={getX(i) - 15}
                  y={padding.top}
                  width={30}
                  height={innerHeight}
                  fill="transparent"
                />

                {activeSeries.headline && (
                  <circle
                    cx={getX(i)}
                    cy={getY(d.headline)}
                    r={isForecast ? 5 : 4}
                    fill={isForecast ? '#38bdf8' : '#10b981'}
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })}

          {/* Hover Tooltip cursor line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={height - padding.bottom}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.4"
            />
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-20 rounded-lg bg-slate-800/95 border border-slate-700 p-2.5 text-xs shadow-2xl text-slate-100"
            style={{
              left: Math.min(hoveredPoint.x + 10, width - 160),
              top: Math.max(10, hoveredPoint.y - 60)
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1 mb-1 flex items-center justify-between gap-3">
              <span>{hoveredPoint.month}</span>
              {hoveredPoint.isForecast && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Projected</span>
              )}
            </div>
            <div className="space-y-0.5 font-mono text-[11px]">
              <div className="flex justify-between gap-3 text-emerald-400">
                <span>Headline CPI:</span>
                <span className="font-bold">{hoveredPoint.headline}%</span>
              </div>
              <div className="flex justify-between gap-3 text-sky-400">
                <span>Urban CPI:</span>
                <span>{hoveredPoint.urban}%</span>
              </div>
              <div className="flex justify-between gap-3 text-amber-400">
                <span>Rural CPI:</span>
                <span>{hoveredPoint.rural}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-slate-400">Urban vs. Rural Food Weight</div>
          <div className="font-mono text-slate-200 mt-1 flex justify-between">
            <span>Urban Food: <strong className="text-sky-400">25.8%</strong></span>
            <span>Rural Food: <strong className="text-amber-400">46.2%</strong></span>
          </div>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-slate-400">Policy Band Corridor</div>
          <div className="font-mono text-slate-200 mt-1 flex justify-between">
            <span>Floor: <strong>2.0%</strong></span>
            <span className="text-emerald-400 font-bold">Mid: 5.0%</span>
            <span>Ceiling: <strong>8.0%</strong></span>
          </div>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-slate-400">Active Projection Horizon</div>
          <div className="font-mono text-slate-200 mt-1 flex items-center justify-between">
            <span className="text-blue-400 font-semibold">{horizon}</span>
            <span className="text-slate-400">
              {forecastHeadline !== undefined ? `Est: ${forecastHeadline}%` : 'Current: 5.1%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
