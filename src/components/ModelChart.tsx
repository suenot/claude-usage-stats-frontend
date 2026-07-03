import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';

ChartJS.register(ArcElement, Tooltip, Legend);

// Base color per family; individual models get shades of it so different
// versions stay visually related but distinguishable.
const FAMILY_BASE: Record<string, string> = {
  opus: '#a78bfa',
  sonnet: '#60a5fa',
  haiku: '#34d399',
  fable: '#f472b6',
  unknown: '#64748b',
};

function getFamily(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('fable')) return 'fable';
  return 'unknown';
}

// Human-readable label: drop the redundant `claude-` prefix and any trailing
// build date (e.g. `-20251001`), keeping the real model id from the logs.
function cleanLabel(model: string): string {
  if (model === 'unknown') return 'unknown';
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
}

// Mix a hex color toward white (factor > 0) or black (factor < 0).
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const t = factor < 0 ? 0 : 255;
  const p = Math.abs(factor);
  const mix = (c: number) => Math.round(c + (t - c) * p);
  const to2 = (c: number) => c.toString(16).padStart(2, '0');
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}

export function ModelChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getModels(range), [range?.from, range?.to]);
  if (loading || !data) return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  // Keep each model as-is (from the logs), largest cost first.
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>By Model</h3>
        <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>Нет данных за выбранный период</div>
      </div>
    );
  }

  // Assign a shade per model, centered on its family's base color.
  const familyCounts: Record<string, number> = {};
  for (const [model] of entries) {
    const fam = getFamily(model);
    familyCounts[fam] = (familyCounts[fam] || 0) + 1;
  }
  const familySeen: Record<string, number> = {};
  const colors = entries.map(([model]) => {
    const fam = getFamily(model);
    const base = FAMILY_BASE[fam] || FAMILY_BASE.unknown;
    const total = familyCounts[fam];
    const i = familySeen[fam] = (familySeen[fam] || 0) + 1;
    if (total <= 1) return base;
    // spread shades across [-0.25, 0.25] around the base
    const factor = ((i - 1) / (total - 1) - 0.5) * 0.5;
    return shade(base, factor);
  });

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>By Model</h3>
      <Doughnut
        data={{
          labels: entries.map(([k]) => cleanLabel(k)),
          datasets: [{
            data: entries.map(([, v]) => parseFloat(v.toFixed(2))),
            backgroundColor: colors,
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
