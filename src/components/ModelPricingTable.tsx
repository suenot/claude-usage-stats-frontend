import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api, type ModelPrice } from '../lib/api';
import {
  filterModelPrices,
  formatContext,
  formatPrice,
  selectModelPrices,
  sortModelPrices,
  type ModelPriceSortKey,
} from '../lib/model-pricing';

const paper = '#F4F4F0';
const ink = '#111111';
const muted = '#66645F';
const line = '#1B1B1B';
const soft = '#DEDDD7';
const red = '#BC1010';

const columns: Array<{ label: string; key: ModelPriceSortKey }> = [
  { label: 'Context', key: 'contextLength' },
  { label: 'Input', key: 'inputPerMillion' },
  { label: 'Cache read', key: 'cacheReadPerMillion' },
  { label: 'Cache write', key: 'cacheWritePerMillion' },
  { label: 'Output', key: 'outputPerMillion' },
];

function displayPrice(value: number | null): string {
  return value === null ? 'N/A' : formatPrice(value);
}

function displayContext(value: number | null): string {
  return value === null ? 'N/A' : formatContext(value);
}

function TierLabel({ model }: { model: ModelPrice }) {
  if (!model.hasPricingOverrides) return null;
  return <span className="border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em]" style={{ borderColor: red, color: red }}>TIERED</span>;
}

function ModelIdentity({ model }: { model: ModelPrice }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="break-words text-base font-bold leading-5" style={{ color: ink }}>{model.name}</h3>
        <TierLabel model={model} />
      </div>
      <p className="mt-2 break-all font-mono text-[10px] leading-4" style={{ color: muted }}>{model.provider} / {model.id}</p>
    </div>
  );
}

function PriceDatum({ label, value, cache = false }: { label: string; value: string; cache?: boolean }) {
  return (
    <div className="min-w-0 p-3" style={{ background: cache ? soft : paper }}>
      <dt className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: cache ? ink : muted }}>{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm font-bold tabular-nums" style={{ color: cache ? red : ink }} title={value}>{value}</dd>
    </div>
  );
}

function ModelCard({ model }: { model: ModelPrice }) {
  return (
    <article className="border-2" style={{ borderColor: line, background: paper }}>
      <div className="border-b p-3" style={{ borderColor: line }}><ModelIdentity model={model} /></div>
      <dl className="grid grid-cols-2 gap-px" style={{ background: line }}>
        <PriceDatum label="CONTEXT" value={displayContext(model.contextLength)} />
        <PriceDatum label="INPUT / 1M" value={displayPrice(model.inputPerMillion)} />
        <PriceDatum label="CACHE READ / 1M" value={displayPrice(model.cacheReadPerMillion)} cache />
        <PriceDatum label="CACHE WRITE / 1M" value={displayPrice(model.cacheWritePerMillion)} cache />
        <div className="col-span-2"><PriceDatum label="OUTPUT / 1M" value={displayPrice(model.outputPerMillion)} /></div>
      </dl>
    </article>
  );
}

function ModelCards({ models }: { models: ModelPrice[] }) {
  return <div className="space-y-3 p-3 md:hidden">{models.map(model => <ModelCard key={model.id} model={model} />)}</div>;
}

function LoadingModels() {
  return (
    <div className="space-y-3 p-3" aria-label="Loading model pricing" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-44 animate-pulse border-2" style={{ borderColor: line, background: index % 2 ? paper : soft }} />
      ))}
    </div>
  );
}

export function ModelPricingTable() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: ModelPriceSortKey; direction: 'asc' | 'desc' } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showAllModels, setShowAllModels] = useState(false);
  const { data, loading, error, refetch } = useApi(() => api.getModelPricing(refreshCount > 0), [refreshCount]);
  const { data: usageModels, loading: usageLoading, error: usageError } = useApi(() => api.getModels(), []);

  const catalogModels = useMemo(() => (
    data && (showAllModels || usageModels)
      ? selectModelPrices(data.models, usageModels ?? {}, showAllModels)
      : []
  ), [data, showAllModels, usageModels]);
  const models = useMemo(() => sortModelPrices(filterModelPrices(catalogModels, query), sort), [catalogModels, query, sort]);
  const waitingForUsage = Boolean(data) && !showAllModels && usageModels === null && usageLoading;
  const loadingRows = (loading && !data) || waitingForUsage;

  const toggleSort = (key: ModelPriceSortKey) => {
    setSort(current => (
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const sortState = (key: ModelPriceSortKey) => (
    sort?.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
  );

  const setSortKey = (key: ModelPriceSortKey | '') => {
    setSort(current => key ? { key, direction: current?.key === key ? current.direction : 'asc' } : null);
  };

  if (error && !data) {
    return (
      <section className="border-2 p-5 sm:p-8" style={{ borderColor: line, background: paper }}>
        <p className="font-mono text-[10px] font-bold tracking-[0.12em]" style={{ color: red }}>MODEL PRICING / ERROR</p>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: ink }}>Pricing data is unavailable.</h2>
        <button type="button" onClick={refetch} className="mt-6 min-h-11 border-2 px-4 font-mono text-xs font-bold tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: line, color: ink, outlineColor: red }}>RETRY</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="model-pricing-heading" className="border-2" style={{ borderColor: line, background: paper, color: ink }}>
      <header className="border-b" style={{ borderColor: line }}>
        <div className="grid gap-px lg:grid-cols-[minmax(0,1fr)_auto]" style={{ background: line }}>
          <div className="p-4 sm:p-6" style={{ background: paper }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.14em]" style={{ color: red }}>MODEL PRICING / OPENROUTER</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="model-pricing-heading" className="text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-5xl">Price index</h2>
                <p className="mt-3 text-sm" style={{ color: muted }}>USD / 1M tokens</p>
              </div>
              {data && <p className="font-mono text-xs font-bold tabular-nums" style={{ color: muted }}>{data.models.length.toLocaleString('en-US')} MODELS</p>}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4 p-4 sm:min-w-72" style={{ background: soft }}>
            {data && <div className="font-mono text-[10px] font-bold leading-5 tracking-[0.08em]" style={{ color: muted }}>
              <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="focus-visible:outline-2 focus-visible:outline-offset-2" style={{ color: red, outlineColor: red }}>OPENROUTER SOURCE</a>
              <p>FETCHED {new Date(data.fetchedAt).toLocaleString('en-US')}</p>
              {data.stale && <p style={{ color: red }}>CACHED SNAPSHOT</p>}
            </div>}
            <button type="button" onClick={() => setRefreshCount(count => count + 1)} disabled={loading} className="min-h-11 border-2 px-4 font-mono text-xs font-bold tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50" style={{ borderColor: line, color: ink, outlineColor: red }}>
              {loading && data ? 'REFRESHING' : 'REFRESH PRICES'}
            </button>
          </div>
        </div>
        {data && <p id="tiered-pricing-note" className="border-t px-4 py-2 font-mono text-[10px] font-bold tracking-[0.08em] sm:px-6" style={{ borderColor: line, background: paper, color: muted }}>TIERED MODELS CAN USE DIFFERENT PRICES FOR LARGER PROMPTS.</p>}
      </header>

      {error && data && <p role="alert" className="border-b px-4 py-3 font-mono text-xs font-bold sm:px-6" style={{ borderColor: line, background: soft, color: red }}>REFRESH FAILED. CURRENT DATA IS STILL SHOWN.</p>}

      <div className="grid gap-px border-b p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end sm:p-4" style={{ borderColor: line, background: line }}>
        <label className="block" style={{ background: paper }}>
          <span className="block px-3 pt-3 font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: muted }}>SEARCH</span>
          <div className="flex">
            <input id="model-pricing-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Model, provider, or ID" className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-[-3px]" style={{ color: ink, outlineColor: red }} />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear model search" className="min-h-11 min-w-11 border-l px-3 font-mono text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-[-3px]" style={{ borderColor: line, color: ink, outlineColor: red }}>X</button>}
          </div>
        </label>
        <label className="flex min-h-11 items-center gap-3 p-3 font-mono text-[10px] font-bold tracking-[0.08em]" style={{ background: paper, color: ink }}>
          <input type="checkbox" checked={showAllModels} onChange={event => setShowAllModels(event.target.checked)} className="h-4 w-4 appearance-none border checked:bg-[#BC1010] focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: line, outlineColor: red }} />
          ALL MODELS
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-px" style={{ background: line }}>
          <label className="block" style={{ background: paper }}>
            <span className="block px-3 pt-3 font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: muted }}>SORT</span>
            <select value={sort?.key ?? ''} onChange={event => setSortKey(event.target.value as ModelPriceSortKey | '')} className="min-h-11 w-full bg-transparent px-3 py-2 font-mono text-xs font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-[-3px]" style={{ color: ink, outlineColor: red }}>
              <option value="">DEFAULT</option>
              {columns.map(column => <option key={column.key} value={column.key}>{column.label.toUpperCase()}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => sort && toggleSort(sort.key)} disabled={!sort} aria-label="Reverse sort direction" className="min-h-11 min-w-11 self-end border-l px-3 font-mono text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-[-3px] disabled:opacity-30" style={{ borderColor: line, background: paper, color: red, outlineColor: red }}>{sort?.direction === 'desc' ? '↓' : '↑'}</button>
        </div>
      </div>

      {usageError && !showAllModels && <p role="alert" className="border-b px-4 py-3 font-mono text-xs font-bold sm:px-6" style={{ borderColor: line, background: soft, color: red }}>LOCAL USAGE IS UNAVAILABLE. ENABLE ALL MODELS TO BROWSE THE CATALOG.</p>}

      {loadingRows ? <LoadingModels /> : (
        <>
          <div className="flex items-center justify-between border-b px-4 py-3 font-mono text-[10px] font-bold tracking-[0.1em] sm:px-6" style={{ borderColor: line, background: paper, color: muted }}>
            <span>{showAllModels ? 'CATALOG' : 'USED MODELS'}</span>
            <span>{models.length.toLocaleString('en-US')} / {data?.models.length.toLocaleString('en-US') ?? '0'}</span>
          </div>
          {models.length === 0 ? <p className="p-8 text-center text-sm" style={{ color: muted }}>No models match this search.</p> : <ModelCards models={models} />}
          <div className="hidden max-h-[70vh] overflow-auto md:block">
            <table className="w-full min-w-[53rem] border-collapse">
              <thead>
                <tr className="border-b-2" style={{ borderColor: line, background: soft }}>
                  <th scope="col" className="sticky top-0 z-10 p-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background: soft, color: ink }}>Model</th>
                  {columns.map(column => (
                    <th key={column.key} scope="col" aria-sort={sortState(column.key)} className="sticky top-0 z-10 p-0 text-right font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background: soft, color: ink }}>
                      <button type="button" onClick={() => toggleSort(column.key)} className="min-h-11 w-full px-3 text-right focus-visible:outline-2 focus-visible:outline-offset-[-3px]" style={{ outlineColor: red }}>
                        {column.label}{sort?.key === column.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map(model => (
                  <tr key={model.id} className="border-b last:border-b-0" style={{ borderColor: line, background: paper }}>
                    <td className="min-w-80 p-3"><ModelIdentity model={model} /></td>
                    <td className="p-3 text-right font-mono text-xs font-bold tabular-nums" style={{ color: ink }}>{displayContext(model.contextLength)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold tabular-nums" style={{ color: ink }}>{displayPrice(model.inputPerMillion)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold tabular-nums" style={{ background: soft, color: red }}>{displayPrice(model.cacheReadPerMillion)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold tabular-nums" style={{ background: soft, color: red }}>{displayPrice(model.cacheWritePerMillion)}</td>
                    <td className="p-3 text-right font-mono text-xs font-bold tabular-nums" style={{ color: ink }}>{displayPrice(model.outputPerMillion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
