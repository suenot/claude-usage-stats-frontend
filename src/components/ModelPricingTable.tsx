import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api, type ModelPrice } from '../lib/api';
import {
  filterModelPrices,
  formatContext,
  formatPrice,
  sortModelPrices,
  type ModelPriceSortKey,
} from '../lib/model-pricing';

const columns: Array<{ label: string; key: ModelPriceSortKey }> = [
  { label: 'Context', key: 'contextLength' },
  { label: 'Input', key: 'inputPerMillion' },
  { label: 'Cache read', key: 'cacheReadPerMillion' },
  { label: 'Cache write', key: 'cacheWritePerMillion' },
  { label: 'Output', key: 'outputPerMillion' },
];

function SkeletonRows() {
  return (
    <tbody aria-label="Loading model prices">
      {Array.from({ length: 8 }, (_, index) => (
        <tr key={index} className="animate-pulse" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
          {Array.from({ length: 6 }, (_, cellIndex) => (
            <td key={cellIndex} className="px-3 py-4">
              <div className="h-3 rounded" style={{ background: 'rgba(148,163,184,0.14)', width: cellIndex === 0 ? '72%' : '55%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function ModelName({ model }: { model: ModelPrice }) {
  const noteId = `tiered-pricing-${model.id.replace(/[^a-z0-9]/gi, '-')}`;
  return (
    <td className="px-3 py-3 min-w-72">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{model.name}</span>
        {model.hasPricingOverrides && (
          <>
            <span
              aria-describedby={noteId}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--accent-yellow)' }}
            >
              Tiered
            </span>
            <span id={noteId} className="sr-only">Larger prompts can use different prices.</span>
          </>
        )}
      </div>
      <div className="mt-1 flex gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        <span>{model.provider}</span>
        <span aria-hidden="true">·</span>
        <span>{model.id}</span>
      </div>
    </td>
  );
}

export function ModelPricingTable() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: ModelPriceSortKey; direction: 'asc' | 'desc' } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const { data, loading, error, refetch } = useApi(
    () => api.getModelPricing(refreshCount > 0),
    [refreshCount],
  );

  const models = useMemo(() => (
    data ? sortModelPrices(filterModelPrices(data.models, query), sort) : []
  ), [data, query, sort]);

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

  return (
    <section aria-labelledby="model-pricing-heading" className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4">
        <div>
          <h2 id="model-pricing-heading" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Model pricing</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Live OpenRouter base prices · USD per 1M tokens</p>
          {data && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noreferrer"
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                style={{ color: 'var(--accent-cyan)' }}
              >
                Source: OpenRouter
              </a>
              <span>Fetched {new Date(data.fetchedAt).toLocaleString()}</span>
              {data.stale && (
                <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--accent-yellow)' }}>
                  Cached snapshot
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRefreshCount(count => count + 1)}
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
          style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)' }}
        >
          {loading && data ? 'Refreshing prices...' : 'Refresh prices'}
        </button>
      </div>

      {error && !data ? (
        <div className="px-5 py-16 text-center">
          <p style={{ color: 'var(--text-primary)' }}>OpenRouter pricing is unavailable</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 rounded-lg px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)' }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y px-5 py-3" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
            <label className="sr-only" htmlFor="model-pricing-search">Search models</label>
            <input
              id="model-pricing-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search models"
              className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm outline-none focus:border-cyan-400"
              style={{ background: 'var(--bg-primary)', borderColor: 'rgba(148,163,184,0.25)', color: 'var(--text-primary)' }}
            />
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{models.length} models</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                  <th scope="col" className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>Model</th>
                  {columns.map(column => {
                    const cacheColumn = column.key === 'cacheReadPerMillion' || column.key === 'cacheWritePerMillion';
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={sortState(column.key)}
                        className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-medium"
                        style={{
                          background: cacheColumn ? 'rgba(52,211,153,0.08)' : 'var(--bg-card)',
                          color: cacheColumn ? 'var(--accent-green)' : 'var(--text-secondary)',
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Sort by ${column.label}`}
                          aria-sort={sortState(column.key)}
                          onClick={() => toggleSort(column.key)}
                          className="font-inherit whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                        >
                          {column.label}{sort?.key === column.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              {loading && !data ? <SkeletonRows /> : (
                <tbody>
                  {models.map(model => (
                    <tr key={model.id} className="transition-colors hover:bg-slate-700/30" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                      <ModelName model={model} />
                      <td className="px-3 py-3 text-right text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatContext(model.contextLength)}</td>
                      <td className="px-3 py-3 text-right text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatPrice(model.inputPerMillion)}</td>
                      <td className="px-3 py-3 text-right text-xs font-mono whitespace-nowrap" style={{ background: 'rgba(52,211,153,0.06)', color: 'var(--accent-green)' }}>{formatPrice(model.cacheReadPerMillion)}</td>
                      <td className="px-3 py-3 text-right text-xs font-mono whitespace-nowrap" style={{ background: 'rgba(52,211,153,0.06)', color: 'var(--accent-green)' }}>{formatPrice(model.cacheWritePerMillion)}</td>
                      <td className="px-3 py-3 text-right text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatPrice(model.outputPerMillion)}</td>
                    </tr>
                  ))}
                  {!loading && models.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No models match this search</td>
                    </tr>
                  )}
                </tbody>
              )}
            </table>
          </div>
        </>
      )}
    </section>
  );
}
