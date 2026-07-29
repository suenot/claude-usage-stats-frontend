import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#60a5fa', '#a78bfa', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#e879f9', '#94a3b8'];

export function SourceChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getSources(range), [range?.from, range?.to]);
  const { data: usage } = useApi(() => api.getSourceUsage(range), [range?.from, range?.to]);
  if (loading || !data || !usage) return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>By Source</h3>
        <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>Нет данных за выбранный период</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>By Source</h3>
      <Doughnut
        data={{
          labels: entries.map(([k]) => k),
          datasets: [{
            data: entries.map(([, v]) => v),
            backgroundColor: COLORS.slice(0, entries.length),
            borderWidth: 0,
          }],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8' } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: $${ctx.parsed.toFixed(2)}` } },
          },
        }}
      />
      <div className="mt-4 space-y-2">
        {Object.entries(usage).sort((a, b) => b[1].tokens - a[1].tokens).map(([source, stats]) => (
          <div key={source} className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{source} · {stats.sessions} sessions</span>
            <span className="font-mono">{stats.tokens.toLocaleString()} tokens · ${stats.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
