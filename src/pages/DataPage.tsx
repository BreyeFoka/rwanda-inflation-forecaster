import React, { useState } from 'react';
import { RefreshCw } from '../components/icons';
import { Card, DataState, PageHeader, StaleBadge } from '../components/ui';
import { ApiError, CatalogEntry, postJson, useApi } from '../lib/api';
import { formatPeriod, monthsOld } from '../lib/theme';

const GROUP_LABELS: Record<string, string> = {
  cpi: 'Consumer prices',
  food: 'Food prices',
  fx: 'Exchange rates',
  rates: 'Interest rates',
  commodities: 'World commodity prices',
  trade: 'Trade',
  rainfall: 'Rainfall'
};

export const DataPage: React.FC = () => {
  const catalog = useApi<CatalogEntry[]>('/catalog');
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
      <PageHeader title="Data and methods" description="Every figure on this site comes from the public sources below. The store refreshes itself once a day.">
        <button onClick={refresh} disabled={refreshing} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </PageHeader>
      {note && <p role="status" className="text-sm text-slate-300">{note}</p>}

      <Card title="How to read this site">
        <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5 max-w-3xl leading-relaxed">
          <li>Inflation here is the national consumer price index for all of Rwanda. The National Bank of Rwanda's 2–8% band is set for urban inflation, which this data source does not carry, so the band on the charts is a rough reference.</li>
          <li>The forecast comes from a seasonal ARIMA model, the method with the lowest error in the accuracy test. It projects the price index twelve months ahead from its own history; inflation is then worked out from the projected index.</li>
          <li>The shaded range is built from the model's own past misses, widened or narrowed to match how volatile prices have been over the last two years. It aims to hold the outcome 80% of the time; the Inflation page shows how often it has.</li>
          <li>Some sources publish late. Series older than six months are marked.</li>
        </ul>
      </Card>

      <Card title="Sources and licences">
        <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5 max-w-3xl leading-relaxed">
          <li>
            <a className="text-white underline" href="https://data.imf.org" target="_blank" rel="noreferrer">International Monetary Fund</a>: consumer prices (compiled from the National Institute of
            Statistics of Rwanda), exchange rates, interest rates and world commodity prices. Used under the IMF's terms of use for its data.
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
          <li>The AI analyst's text is written by Google Gemini from the figures on this site. It can be wrong; check it against the charts.</li>
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
                          <th scope="col" className="font-medium pb-2">Series</th>
                          <th scope="col" className="font-medium pb-2">Unit</th>
                          <th scope="col" className="font-medium pb-2 text-right">Months</th>
                          <th scope="col" className="font-medium pb-2 text-right">Coverage</th>
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
