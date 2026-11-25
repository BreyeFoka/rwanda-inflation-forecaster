import React from 'react';
import { SeriesChart } from '../components/charts/SeriesChart';
import { Delta } from '../components/Delta';
import { DataState, PageHeader, StaleBadge } from '../components/ui';
import { Indicator, SeriesMap, useApi } from '../lib/api';
import { formatPeriod, formatValue, monthsOld } from '../lib/theme';

const SECTIONS = [
  { group: 'fx', title: 'Exchange rates', note: 'How many Rwandan francs one dollar or euro costs. A rising line means the franc is losing value, which makes imports dearer.' },
  { group: 'commodities', title: 'World commodity prices', note: "World prices of oil, grains, fertiliser, coffee and tea. They affect what Rwanda pays for fuel and food, and earns from exports." },
  { group: 'trade', title: 'Trade', note: 'Value of goods Rwanda sells abroad.' }
];

const Section: React.FC<{ group: string; title: string; note: string }> = ({ group, title, note }) => {
  const indicators = useApi<Indicator[]>(`/indicators?group=${group}`);
  const ids = indicators.data?.map(i => i.series_id).join(',');
  const history = useApi<SeriesMap>(ids ? `/series?ids=${ids}&months=120` : null);

  return (
    <section>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="text-xs text-slate-400 mt-0.5 mb-3">{note}</p>
      <DataState state={indicators} label={title.toLowerCase()}>
        {items => (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(i => (
              <article key={i.series_id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="text-xs text-slate-300">{i.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-white">{formatValue(i.value)}</span>
                  <span className="text-xs text-slate-500">{i.unit}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 mb-2">
                  <span className="flex items-center gap-1"><Delta value={i.change_yoy} unit={i.change_unit === 'pp' ? ' pp' : '%'} upIsBad={group !== 'trade'} /> since a year ago</span>
                  <span>{formatPeriod(i.period)}</span>
                  <StaleBadge months={monthsOld(i.period)} />
                </div>
                {history.data?.[i.series_id] && <SeriesChart observations={history.data[i.series_id].observations} unit={i.unit.startsWith('%') ? '%' : i.unit} height={130} compact />}
              </article>
            ))}
          </div>
        )}
      </DataState>
    </section>
  );
};

export const Markets: React.FC = () => (
  <div className="space-y-8">
    <PageHeader title="Money and markets" description="The exchange rate and world prices that affect what Rwanda pays for imports and what its exports earn. Charts show the last ten years." />
    {SECTIONS.map(s => <Section key={s.group} {...s} />)}
    <p className="text-xs text-slate-500 max-w-3xl">
      Interest rates are not shown here because the latest public figures (IMF) stop in September 2025. They are still listed on the Data page.
    </p>
  </div>
);
