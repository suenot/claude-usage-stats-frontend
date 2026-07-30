import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';
import { colorForSource } from '../lib/model-colors';

ChartJS.register(ArcElement, Tooltip, Legend);

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

export function SourceChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getSources(range), [range?.from, range?.to]);
  const { data: usage } = useApi(() => api.getSourceUsage(range), [range?.from, range?.to]);
  if (loading || !data || !usage) {
    return <div className="min-h-96 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading harness split" />;
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <section className="min-h-96 border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
        <header className="border-b border-[#111111] pb-3">
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">By harness</h3>
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">No data in range</div>
      </section>
    );
  }

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <header className="border-b-2 border-[#111111] pb-3">
        <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">By harness</h3>
      </header>
      <div className="h-60 pt-4 sm:h-64">
        <Doughnut
          data={{
            labels: entries.map(([key]) => key),
            datasets: [{
              data: entries.map(([, value]) => value),
              backgroundColor: entries.map(([source]) => colorForSource(source)),
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
        {Object.entries(usage).sort((a, b) => b[1].tokens - a[1].tokens).map(([source, stats], index) => (
          <div key={source} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-[#DEDDD7] py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline">
            <span className="mt-1 h-2.5 w-2.5 border border-[#111111]" style={{ background: colorForSource(source) }} aria-hidden="true" />
            <dt className="min-w-0 text-xs font-bold uppercase tracking-[0.08em] text-[#111111]">{source}</dt>
            <dd className="col-start-2 mt-1 font-mono text-[11px] tabular-nums text-[#66645F] sm:col-start-auto sm:mt-0">
              {stats.sessions} sessions - {stats.tokens.toLocaleString('en-US')} tokens - ${stats.cost.toFixed(2)}
            </dd>
            <span className="sr-only">Rank {index + 1}</span>
          </div>
        ))}
      </dl>
    </section>
  );
}
