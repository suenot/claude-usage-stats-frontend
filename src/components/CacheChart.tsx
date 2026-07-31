import { useApi } from '../hooks/useApi';
import { api, type CacheStats, type DateRange } from '../lib/api';
import { colorForModel } from '../lib/model-colors';

const dollars = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
function fmtTokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function CacheChart({ range, stats }: { range?: DateRange; stats?: CacheStats }) {
  const { data, loading } = useApi(() => stats ? Promise.resolve(stats) : api.getCache(range), [stats, range?.from, range?.to]);
  if (loading || !data) return <div className="min-h-80 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading cache impact" />;

  if (data.no_cache_cost <= 0) {
    return (
      <section className="min-h-80 border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
        <header className="border-b-2 border-[#111111] pb-3">
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Cache impact</h3>
        </header>
        <div className="flex h-44 items-center justify-center font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">No data in range</div>
      </section>
    );
  }

  const actualWidth = Math.max((data.actual_cost / data.no_cache_cost) * 100, 0.6);
  const maxSaved = Math.max(...data.by_model.map(model => model.saved), 1);

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <div className="grid gap-4 border-b-2 border-[#111111] pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Cache impact</h3>
          <p className="mt-2 text-xs leading-5 text-[#66645F]">Cost if cached tokens were billed as new input.</p>
        </div>
        <div className="border-l-4 border-[#BC1010] pl-3 sm:text-right">
          <data value={String(data.saved)} className="block font-mono text-2xl font-bold tabular-nums text-[#111111]">{dollars(data.saved)}</data>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#66645F]">Saved -{data.saved_pct.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="font-bold uppercase tracking-[0.08em] text-[#66645F]">Without cache</span>
            <span className="font-mono tabular-nums text-[#111111]">{dollars(data.no_cache_cost)}</span>
          </div>
          <div className="h-4 border border-[#111111] bg-[#111111]" />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="font-bold uppercase tracking-[0.08em] text-[#111111]">Actual cost</span>
            <span className="font-mono tabular-nums text-[#111111]">{dollars(data.actual_cost)}</span>
          </div>
          <div className="h-4 border border-[#111111] bg-[#DEDDD7]">
            <div className="h-full bg-[#BC1010]" style={{ width: `${actualWidth}%` }} />
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-px border border-[#111111] bg-[#111111] sm:grid-cols-3">
        {[
          { label: 'Cache hit rate', value: `${data.hit_rate.toFixed(1)}%` },
          { label: 'Cache read', value: fmtTokens(data.cache_read) },
          { label: 'Input / output', value: `${fmtTokens(data.input_tokens)} / ${fmtTokens(data.output_tokens)}` },
        ].map(stat => (
          <div key={stat.label} className="bg-[#F4F4F0] px-3 py-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#66645F]">{stat.label}</dt>
            <dd className="mt-2 overflow-hidden font-mono text-sm font-bold tabular-nums text-[#111111]">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-[#111111]">
        {data.by_model.map(model => (
          <div key={model.model} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-[#DEDDD7] py-3 sm:grid-cols-[minmax(110px,0.7fr)_minmax(0,1fr)_auto_auto] sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 border border-[#111111]" style={{ background: colorForModel(model.model) }} />
              <span className="truncate font-mono text-[11px] text-[#111111]" title={model.model}>{model.model}</span>
            </div>
            <div className="order-3 col-span-2 mt-2 h-2 border border-[#111111] bg-[#DEDDD7] sm:order-none sm:col-span-1 sm:mt-0">
              <div className="h-full" style={{ width: `${Math.max((model.saved / maxSaved) * 100, 0.5)}%`, background: colorForModel(model.model) }} />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[#111111]">{dollars(model.saved)}</span>
            <span className="font-mono text-[11px] tabular-nums text-[#66645F]">{model.hit_rate.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
