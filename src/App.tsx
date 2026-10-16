import React from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Analyst } from './pages/Analyst';
import { Climate } from './pages/Climate';
import { DataPage } from './pages/DataPage';
import { Inflation } from './pages/Inflation';
import { Markets } from './pages/Markets';
import { Overview } from './pages/Overview';
import { Prices } from './pages/Prices';

const PAGES = [
  { to: '/', label: 'Overview', element: <Overview /> },
  { to: '/inflation', label: 'Inflation', element: <Inflation /> },
  { to: '/prices', label: 'Food prices', element: <Prices /> },
  { to: '/markets', label: 'Markets', element: <Markets /> },
  { to: '/climate', label: 'Rainfall', element: <Climate /> },
  { to: '/analyst', label: 'AI analyst', element: <Analyst /> },
  { to: '/data', label: 'Data', element: <DataPage /> }
];

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-x-8">
          <NavLink to="/" className="flex items-center gap-2.5 py-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-extrabold text-slate-950 text-xs">RW</span>
            <span className="text-sm font-bold tracking-tight text-white">Rwanda Inflation Forecaster</span>
          </NavLink>
          <nav aria-label="Main" className="flex flex-wrap gap-x-1 -mb-px text-sm">
            {PAGES.map(page => (
              <NavLink
                key={page.to}
                to={page.to}
                end={page.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-3.5 font-medium border-b-2 transition-colors ${isActive ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`
                }
              >
                {page.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Routes>
          {PAGES.map(page => <Route key={page.to} path={page.to} element={page.element} />)}
          <Route path="*" element={<p className="text-sm text-slate-400">That page does not exist. <NavLink to="/" className="text-white underline">Go to the overview</NavLink>.</p>} />
        </Routes>
      </main>

      <footer className="border-t border-slate-900 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap justify-between gap-2">
          <span>
            Data: IMF, World Bank, WFP, Open-Meteo. Forecasts: Google TimesFM 3.0.{' '}
            <NavLink to="/data" className="underline hover:text-slate-300">Sources and licences</NavLink>
          </span>
          <span>Forecasts are statistical projections, not official figures.</span>
        </div>
      </footer>
    </div>
  );
}
