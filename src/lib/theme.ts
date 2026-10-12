// Chart colours. The series pairs pass the dataviz palette validator on the dark slate surface.
export const SERIES = { actual: '#059669', forecast: '#3b82f6' };
export const DIVERGING = { above: '#3b82f6', below: '#d97706' };
export const BAND = '#059669';
export const INK = { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b', grid: '#1e293b', axis: '#334155' };
export const AXIS_TICK = { fill: INK.muted, fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace' };

export const formatPeriod = (period: string) =>
  new Date(`${period}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

export const signed = (v: number | null, unit: string, digits = 1) =>
  v === null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}${unit}`;

export const monthsOld = (period: string) => {
  const now = new Date();
  return (now.getFullYear() - Number(period.slice(0, 4))) * 12 + (now.getMonth() + 1 - Number(period.slice(5, 7)));
};

/** Compact number for axes and tiles: 1,467 / 102.0 / 6.75 */
export const formatValue = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 1 : 2 });
