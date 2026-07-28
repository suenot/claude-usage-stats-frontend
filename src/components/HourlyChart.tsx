import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, type TooltipItem } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange, type HourlyEntry } from '../lib/api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

type Metric = 'cost' | 'tokens';

// Token classes in stack order (bottom → top), cheapest-per-token first, so the
// bulk of the volume sits underneath and the expensive slivers stay visible.
const TOKEN_SERIES: { key: keyof HourlyEntry; label: string; color: string }[] = [
  { key: 'cache_read', label: 'Cache read', color: '#22d3ee' },
  { key: 'cache_write', label: 'Cache write', color: '#fbbf24' },
  { key: 'input_tokens', label: 'Input', color: '#60a5fa' },
  { key: 'output_tokens', label: 'Output', color: '#a78bfa' },
];

const COST_COLOR = '#22d3ee';
const COST_PEAK = '#a78bfa';

function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
const fmtCost = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(v < 10 ? 2 : 0)}`);

export function HourlyChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getHourly(range), [range?.from, range?.to]);
  const [metric, setMetric] = useState<Metric>('cost');
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const hours = useMemo(() => data || [], [data]);

  const totals = useMemo(() => {
    const t = { cost: 0, input_tokens: 0, output_tokens: 0, cache_read: 0, cache_write: 0 };
    for (const h of hours) {
      t.cost += h.cost;
      t.input_tokens += h.input_tokens;
      t.output_tokens += h.output_tokens;
      t.cache_read += h.cache_read;
      t.cache_write += h.cache_write;
    }
    return t;
  }, [hours]);

  const allTokens = totals.input_tokens + totals.output_tokens + totals.cache_read + totals.cache_write;

  // Busiest hour by the metric currently on screen.
  const peak = useMemo(() => {
    let best = -1, bestVal = -1;
    for (const h of hours) {
      const v = metric === 'cost'
        ? h.cost
        : TOKEN_SERIES.reduce((s, t) => s + (hidden.has(t.label) ? 0 : (h[t.key] as number)), 0);
      if (v > bestVal) { bestVal = v; best = h.hour; }
    }
    return { hour: best, value: bestVal };
  }, [hours, metric, hidden]);

  const chartData = useMemo(() => {
    if (metric === 'cost') {
      return {
        labels: hours.map(h => String(h.hour)),
        datasets: [{
          label: 'Стоимость',
          data: hours.map(h => h.cost),
          backgroundColor: hours.map(h => (h.hour === peak.hour ? COST_PEAK : COST_COLOR)),
          borderRadius: 3,
          maxBarThickness: 30,
        }],
      };
    }
    return {
      labels: hours.map(h => String(h.hour)),
      datasets: TOKEN_SERIES.filter(t => !hidden.has(t.label)).map(t => ({
        label: t.label,
        data: hours.map(h => h[t.key] as number),
        backgroundColor: t.color,
        borderRadius: 2,
        maxBarThickness: 30,
      })),
    };
  }, [hours, metric, hidden, peak.hour]);

  if (loading || !data) {
    return <div className="h-72 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;
  }

  const fmtValue = metric === 'cost' ? fmtCost : fmtTokens;

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Расход по часам суток</h3>
          <div className="flex items-baseline gap-3 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono text-base" style={{ color: 'var(--accent-cyan)' }}>
              {metric === 'cost' ? `$${totals.cost.toFixed(2)}` : `${fmtTokens(allTokens)} токенов`}
            </span>
            {peak.hour >= 0 && peak.value > 0 && (
              <span>пик в {String(peak.hour).padStart(2, '0')}:00 · {fmtValue(peak.value)}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          {([['cost', 'Стоимость'], ['tokens', 'Токены']] as [Metric, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className="px-3 py-1 text-xs rounded-md transition-colors"
              style={{
                background: metric === key ? 'var(--accent-blue)' : 'transparent',
                color: metric === key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {metric === 'tokens' && (
        // Cache reads outweigh everything else by orders of magnitude, so the
        // toggles are what make input/output legible at all.
        <div className="flex flex-wrap gap-2 mb-3">
          {TOKEN_SERIES.map(t => {
            const off = hidden.has(t.label);
            const sum = totals[t.key as keyof typeof totals] as number;
            return (
              <button
                key={t.label}
                onClick={() => setHidden(prev => {
                  const next = new Set(prev);
                  if (next.has(t.label)) next.delete(t.label); else next.add(t.label);
                  return next;
                })}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-opacity"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', opacity: off ? 0.4 : 1 }}
                title={off ? 'Показать' : 'Скрыть'}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: off ? '#64748b' : t.color }} />
                <span style={{ textDecoration: off ? 'line-through' : 'none' }}>{t.label}</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtTokens(sum)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ height: 260 }}>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderColor: 'rgba(148,163,184,0.2)',
                borderWidth: 1,
                padding: 10,
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                footerColor: '#94a3b8',
                callbacks: {
                  title: (items: TooltipItem<'bar'>[]) => `${String(hours[items[0].dataIndex].hour).padStart(2, '0')}:00`,
                  label: (ctx: TooltipItem<'bar'>) => {
                    const v = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                    if (v <= 0) return '';
                    return metric === 'cost' ? ` $${v.toFixed(2)}` : ` ${ctx.dataset.label}: ${fmtTokens(v)}`;
                  },
                  footer: (items: TooltipItem<'bar'>[]) => {
                    const h = hours[items[0].dataIndex];
                    if (metric === 'cost') return `${h.sessions} сессий активно`;
                    const sum = items.reduce((s, i) => s + (typeof i.parsed.y === 'number' ? i.parsed.y : 0), 0);
                    return `Всего: ${fmtTokens(sum)} · $${h.cost.toFixed(2)}`;
                  },
                },
              },
            },
            scales: {
              x: {
                stacked: true,
                ticks: { color: '#94a3b8', font: { size: 10 } },
                grid: { display: false },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v) => fmtValue(Number(v)) },
                grid: { color: 'rgba(148,163,184,0.08)' },
                border: { display: false },
              },
            },
          }}
        />
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
        Час — местное время, по метке каждого сообщения, а не по началу сессии. Диапазон берется из графика выше.
      </p>
    </div>
  );
}
