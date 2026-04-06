import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const MODEL_COLORS: Record<string, string> = {
  opus: '#a78bfa',
  sonnet: '#60a5fa',
  haiku: '#34d399',
  unknown: '#64748b',
};

function getFamily(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return 'unknown';
}

export function ModelChart() {
  const { data, loading } = useApi(() => api.getModels(), []);
  if (loading || !data) return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  // Group by family
  const families: Record<string, number> = {};
  for (const [model, cost] of Object.entries(data)) {
    const family = getFamily(model);
    families[family] = (families[family] || 0) + cost;
  }
  const entries = Object.entries(families).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>By Model Family</h3>
      <Doughnut
        data={{
          labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
          datasets: [{
            data: entries.map(([, v]) => parseFloat(v.toFixed(2))),
            backgroundColor: entries.map(([k]) => MODEL_COLORS[k] || '#64748b'),
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
    </div>
  );
}
