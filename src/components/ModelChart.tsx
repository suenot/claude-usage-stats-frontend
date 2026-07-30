import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';
import { projectModelColors } from '../lib/project-chart';
import { formatUsageMetric, formatUsageSummary, usageSlices, type UsageMetric } from '../lib/usage-chart';
import { UsageMetricToggle } from './UsageMetricToggle';

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
  const [metric, setMetric] = useState<UsageMetric>('usd');
  const { data, loading } = useApi(() => api.getModelUsage(range), [range?.from, range?.to]);
  if (loading || !data) {
    return <div className="min-h-96 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading model split" />;
  }

  const slices = usageSlices(data, metric);
  if (slices.length === 0) {
    return (
      <section className="min-h-96 border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#111111] pb-3">
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">By model</h3>
          <UsageMetricToggle label="Model chart metric" metric={metric} onChange={setMetric} />
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">No usage for this metric</div>
      </section>
    );
  }

  const colors = projectModelColors(slices.map(slice => slice.label), Object.keys(data));

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#111111] pb-3">
        <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">By model</h3>
        <UsageMetricToggle label="Model chart metric" metric={metric} onChange={setMetric} />
      </header>
      <div className="h-60 pt-4 sm:h-64">
        <Doughnut
          data={{
            labels: slices.map(slice => cleanLabel(slice.label)),
            datasets: [{
              data: slices.map(slice => slice.value),
              backgroundColor: colors,
              borderColor: '#F4F4F0',
              borderWidth: 2,
              spacing: 1,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: '67%',
            plugins: {
              legend: { display: false },
              tooltip: {
                ...chartTooltip,
                callbacks: {
                  label: context => `${context.label}: ${formatUsageMetric(context.parsed, metric)}`,
                  footer: items => formatUsageSummary(slices[items[0].dataIndex].stats, metric),
                },
              },
            },
          }}
        />
      </div>
      <dl className="border-t border-[#111111]">
        {slices.map((slice, index) => (
          <div key={slice.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-[#DEDDD7] py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline">
            <span className="mt-1 h-2.5 w-2.5 border border-[#111111]" style={{ background: colors[index] }} aria-hidden="true" />
            <dt className="min-w-0 break-words font-mono text-[11px] leading-4 text-[#111111]">{cleanLabel(slice.label)}</dt>
            <dd className="col-start-2 mt-1 font-mono text-[11px] tabular-nums text-[#66645F] sm:col-start-auto sm:mt-0">
              {formatUsageSummary(slice.stats, metric)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
