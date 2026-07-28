import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';

const MODEL_COLORS: Record<string, string> = {
  'Opus': '#a78bfa',
  'Sonnet': '#60a5fa',
  'Haiku': '#34d399',
  'Fable': '#f472b6',
  'GLM 5.2': '#22d3ee',
};
const colorFor = (model: string) => MODEL_COLORS[model] || '#94a3b8';

const dollars = (v: number) => `$${Math.round(v).toLocaleString('ru-RU')}`;
function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function CacheChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getCache(range), [range?.from, range?.to]);

  if (loading || !data) {
    return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;
  }

  if (data.no_cache_cost <= 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Экономия на кэше</h3>
        <div className="h-32 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Нет данных за выбранный период
        </div>
      </div>
    );
  }

  // Both bars share one scale — the no-cache bar is the full width, so the
  // actual bar's stub reads as the fraction actually paid.
  const actualWidth = Math.max((data.actual_cost / data.no_cache_cost) * 100, 0.6);
  const maxSaved = Math.max(...data.by_model.map(m => m.saved), 1);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Экономия на кэше</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Сколько стоил бы тот же трафик, если бы каждый токен из кэша считался свежим input
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold" style={{ color: 'var(--accent-green)' }}>
            {dollars(data.saved)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            минус {data.saved_pct.toFixed(1)}% от полной цены
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-secondary)' }}>Без кэша</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{dollars(data.no_cache_cost)}</span>
          </div>
          <div className="h-3 rounded-full" style={{ background: 'rgba(248,113,113,0.35)' }} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-primary)' }}>Фактически заплачено</span>
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{dollars(data.actual_cost)}</span>
          </div>
          <div className="h-3 rounded-full" style={{ background: 'rgba(148,163,184,0.12)' }}>
            <div className="h-3 rounded-full" style={{ width: `${actualWidth}%`, background: 'var(--accent-green)' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Промпта из кэша', value: `${data.hit_rate.toFixed(1)}%` },
          { label: 'Cache read', value: fmtTokens(data.cache_read) },
          { label: 'Input / Output', value: `${fmtTokens(data.input_tokens)} / ${fmtTokens(data.output_tokens)}` },
        ].map(s => (
          <div key={s.label} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            <div className="font-mono text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {data.by_model.map(m => (
          <div key={m.model} className="flex items-center gap-3 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colorFor(m.model) }} />
            <span className="w-16 shrink-0" style={{ color: 'var(--text-secondary)' }}>{m.model}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(148,163,184,0.1)' }}>
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max((m.saved / maxSaved) * 100, 0.5)}%`, background: colorFor(m.model) }}
              />
            </div>
            <span className="font-mono w-20 text-right shrink-0" style={{ color: 'var(--text-primary)' }}>{dollars(m.saved)}</span>
            <span className="font-mono w-12 text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>{m.hit_rate.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
