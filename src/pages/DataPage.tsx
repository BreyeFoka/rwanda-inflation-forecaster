import React, { useState } from 'react';
import { RefreshCw } from '../components/icons';
import { Card, DataState, PageHeader, StaleBadge } from '../components/ui';
import { ApiError, CatalogEntry, postJson, useApi } from '../lib/api';
import { formatPeriod, monthsOld } from '../lib/theme';

const GROUP_LABELS: Record<string, string> = {
  cpi: 'Shop prices, whole country',
  cpi_detail: 'Shop prices in towns and villages',
  ppi: 'Factory and producer prices',
  food: 'Food prices',
  fx: 'Exchange rates',
  rates: 'Interest rates',
  commodities: 'World commodity prices',
  trade: 'Trade',
  rainfall: 'Rainfall'
};

export const DataPage: React.FC = () => {
  const catalog = useApi<CatalogEntry[]>('/catalog');
  const health = useApi<{ snapshot?: boolean }>('/health');
  // The hosted site serves a fixed snapshot; only a full server can re-pull the sources on request.
  const live = health.data ? !health.data.snapshot : false;
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setNote(null);
    try {
      const result = await postJson<{ failed: string[] }>('/refresh');
      setNote(result.failed.length ? `Refreshed. These sources failed and kept their previous data: ${result.failed.join(', ')}.` : 'All sources refreshed.');
      catalog.reload();
    } catch (e) {
      setNote((e as ApiError).message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data and methods"
        description={live
          ? 'Where every figure on this site comes from. The data updates itself once a day.'
          : 'Where every figure on this site comes from. We update the data each month, after NISR publishes its new price figures (around the 10th).'}
      >
        {live && <button onClick={refresh} disabled={refreshing} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>}
      </PageHeader>
      {note && <p role="status" className="text-sm text-slate-300">{note}</p>}

      <Card title="How to read this site">
        <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5 max-w-3xl leading-relaxed">
          <li>The forecast covers shop prices across the whole country. Rwanda's official headline figure covers towns only, and that is the one the National Bank of Rwanda aims to keep between 2% and 8%. The Inflation and Poverty and prices pages show towns and villages separately.</li>
          <li>The forecast uses a statistical model that learns from the regular ups and downs of past prices, including seasons like harvests (called seasonal ARIMA). We picked it because it was the most accurate in our tests, beating Google's AI model.</li>
          <li>The shaded range around the forecast comes from how far off the model has been in the past, and it widens when prices have been jumping around. The real figure should land inside it about 8 times out of 10; the Inflation page shows how often it has.</li>
          <li>Some sources publish late. Figures more than six months old are marked.</li>
        </ul>
      </Card>

      <Card title="Sources and licences">
        <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5 max-w-3xl leading-relaxed">
          <li>
            <a className="text-white underline" href="https://www.statistics.gov.rw" target="_blank" rel="noreferrer">National Institute of Statistics of Rwanda (NISR)</a>: the Consumer Price Index
            time series (all Rwanda, urban, rural, core, local and imported goods, from February 2009), the Producer Price Index (from December 2010), and the EICV7 poverty profile tables (2024 household survey).
            Read directly from NISR's published Excel files.
          </li>
          <li>
            <a className="text-white underline" href="https://data.imf.org" target="_blank" rel="noreferrer">International Monetary Fund</a>: consumer prices before 2009 (compiled from NISR), exchange rates, interest rates and world commodity prices. Used under the IMF's terms of use for its data.
          </li>
          <li>
            <a className="text-white underline" href="https://datacatalog.worldbank.org/search/dataset/0037798" target="_blank" rel="noreferrer">World Bank Global Economic Monitor</a>: merchandise exports. Licensed CC BY 4.0.
          </li>
          <li>
            <a className="text-white underline" href="https://data.humdata.org/dataset/wfp-food-prices-for-rwanda" target="_blank" rel="noreferrer">World Food Programme, via the Humanitarian Data Exchange</a>: retail food prices across Rwandan markets. Licensed CC BY-IGO.
          </li>
          <li>
            <a className="text-white underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> historical weather archive: provincial rainfall. Licensed CC BY 4.0. Built on ERA5 reanalysis
            from the Copernicus Climate Change Service; contains modified Copernicus Climate Change Service information.
          </li>
          <li>
            Forecasts: seasonal ARIMA via <a className="text-white underline" href="https://www.statsmodels.org" target="_blank" rel="noreferrer">statsmodels</a> (BSD), compared against Google Research's <a className="text-white underline" href="https://github.com/google-research/timesfm" target="_blank" rel="noreferrer">TimesFM 3.0</a> and a no-change baseline.
          </li>
          <li>The AI analyst selects from statements generated by the server from this site's data and forecasts. Unsupported questions receive a no-data answer.</li>
          <li>This site is an independent project. It is not affiliated with or endorsed by the National Bank of Rwanda, NISR or any data provider.</li>
        </ul>
      </Card>

      <DataState state={catalog} label="the series list">
        {entries => (
          <>
            {Object.entries(GROUP_LABELS).map(([group, label]) => {
              const rows = entries.filter(e => e.group === group);
              if (!rows.length) return null;
              return (
                <Card key={group} title={label} note={[...new Set(rows.map(r => r.source))].join('; ')}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 text-left">
                          <th scope="col" className="font-medium pb-2">Figure</th>
                          <th scope="col" className="font-medium pb-2">Unit</th>
                          <th scope="col" className="font-medium pb-2 text-right">Months</th>
                          <th scope="col" className="font-medium pb-2 text-right">Period covered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.series_id} className="border-t border-slate-800">
                            <th scope="row" className="py-1.5 text-left font-normal text-slate-200">{r.name}</th>
                            <td className="py-1.5 text-slate-400">{r.unit}</td>
                            <td className="py-1.5 text-right font-mono text-slate-300">{r.n}</td>
                            <td className="py-1.5 text-right text-slate-300 whitespace-nowrap">
                              {formatPeriod(r.first_period)} to {formatPeriod(r.last_period)} <StaleBadge months={monthsOld(r.last_period)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </DataState>
    </div>
  );
};
