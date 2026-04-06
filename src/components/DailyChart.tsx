import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import type { DailyChartEntry } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SOURCE_COLORS: Record<string, string> = {
  'Claude Code': '#60a5fa',
  'Claude Desktop': '#a78bfa',
  'OpenClaw': '#22d3ee',
  'Clawdbot': '#22d3ee',
  'Cursor': '#34d399',
  'Windsurf': '#fbbf24',
  'Cline': '#f87171',
  'Roo Code': '#fb923c',
  'Aider': '#e879f9',
  'Continue': '#94a3b8',
};

export function DailyChart() {
  const { data, loading } = useApi(() => api.getDailyChart(30), []);
  if (loading || !data) return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  const allSources = new Set<string>();
  for (const d of data) {
    for (const s of Object.keys(d.sources)) allSources.add(s);
  }

  const datasets = [...allSources].map(source => ({
    label: source,
    data: data.map(d => parseFloat((d.sources[source] || 0).toFixed(2))),
    backgroundColor: SOURCE_COLORS[source] || '#94a3b8',
    borderRadius: 3,
  }));

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Daily Spend by Source</h3>
      <Bar
        data={{
          labels: data.map(d => d.date.slice(5)),
          datasets,
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8' } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: $${(ctx.parsed.y ?? 0).toFixed(2)}`,
              },
            },
          },
          scales: {
            x: { stacked: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.1)' } },
            y: {
              stacked: true,
              ticks: { color: '#64748b', callback: (v) => `$${v}` },
              grid: { color: 'rgba(148,163,184,0.1)' },
            },
          },
        }}
      />
    </div>
  );
}
