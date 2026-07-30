import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';
import { colorForModel, modelFamilyFor, shade } from '../lib/model-colors';

ChartJS.register(ArcElement, Tooltip, Legend);

function cleanLabel(model: string): string {
  if (model === 'GLM 5.2') return 'GLM 5.2';
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
}

const chartTooltip = {
  backgroundColor: '#F4F4F0',
  borderColor: '#111111',
  borderWidth: 1,
  padding: 10,
  titleColor: '#111111',
  bodyColor: '#111111',
  footerColor: '#66645F',
  displayColors: true,
};

export function ModelChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getModels(range), [range?.from, range?.to]);
  if (loading || !data) {
    return <div className="min-h-96 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading model split" />;
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <section className="min-h-96 border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
        <header className="border-b border-[#111111] pb-3">
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">By model</h3>
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">No data in range</div>
      </section>
    );
  }

  const familyCounts: Record<string, number> = {};
  for (const [model] of entries) {
    const family = modelFamilyFor(model);
    familyCounts[family] = (familyCounts[family] || 0) + 1;
  }
  const familySeen: Record<string, number> = {};
  const colors = entries.map(([model]) => {
    const family = modelFamilyFor(model);
    const base = colorForModel(model);
    const total = familyCounts[family];
    const index = familySeen[family] = (familySeen[family] || 0) + 1;
    return total <= 1 ? base : shade(base, ((index - 1) / (total - 1) - 0.5) * 0.5);
  });

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <header className="border-b-2 border-[#111111] pb-3">
        <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">By model</h3>
      </header>
      <div className="h-60 pt-4 sm:h-64">
        <Doughnut
          data={{
            labels: entries.map(([key]) => cleanLabel(key)),
            datasets: [{
              data: entries.map(([, value]) => parseFloat(value.toFixed(2))),
              backgroundColor: colors,
              borderColor: '#F4F4F0',
              borderWidth: 2,
              spacing: 1,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '67%',
            plugins: {
              legend: { display: false },
              tooltip: { ...chartTooltip, callbacks: { label: context => `${context.label}: $${context.parsed.toFixed(2)}` } },
            },
          }}
        />
      </div>
      <dl className="border-t border-[#111111]">
        {entries.map(([model, cost], index) => (
          <div key={model} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-[#DEDDD7] py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline">
            <span className="mt-1 h-2.5 w-2.5 border border-[#111111]" style={{ background: colors[index] }} aria-hidden="true" />
            <dt className="min-w-0 break-words font-mono text-[11px] leading-4 text-[#111111]">{cleanLabel(model)}</dt>
            <dd className="col-start-2 mt-1 font-mono text-[11px] tabular-nums text-[#66645F] sm:col-start-auto sm:mt-0">${cost.toFixed(2)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
