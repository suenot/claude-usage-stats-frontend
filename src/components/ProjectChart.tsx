import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import type { ProjectEntry } from '../lib/api';
import {
  formatProjectMetric,
  projectSlices,
  type ProjectMetric,
} from '../lib/project-chart';

ChartJS.register(ArcElement, Tooltip);

const COLORS = [
  '#22d3ee', '#60a5fa', '#a78bfa', '#34d399', '#fbbf24',
  '#fb923c', '#f87171', '#818cf8', '#2dd4bf', '#64748b',
];

interface ProjectChartProps {
  data: ProjectEntry[] | null;
  loading: boolean;
}

export function ProjectChart({ data, loading }: ProjectChartProps) {
  const [metric, setMetric] = useState<ProjectMetric>('usd');

  if (loading || !data) {
    return (
      <section className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--bg-card)' }}>
        <div className="h-5 w-28 rounded" style={{ background: 'var(--bg-secondary)' }} />
        <div className="mt-5 h-56 rounded" style={{ background: 'var(--bg-secondary)' }} />
      </section>
    );
  }

  const slices = projectSlices(data, metric);

  return (
    <section className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>By Project</h3>
        <div
          aria-label="Project chart metric"
          className="flex rounded-lg p-0.5"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {(['usd', 'tokens'] as const).map(option => {
            const selected = metric === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setMetric(option)}
                className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  background: selected ? 'var(--accent-blue)' : 'transparent',
                  color: selected ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {option === 'usd' ? 'USD' : 'Tokens'}
              </button>
            );
          })}
        </div>
      </div>

      {slices.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          No project usage yet
        </div>
      ) : (
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="h-56 min-w-0 flex-1">
            <Doughnut
              data={{
                labels: slices.map(slice => slice.label),
                datasets: [{
                  data: slices.map(slice => slice.value),
                  backgroundColor: slices.map((_, index) => COLORS[index]),
                  borderWidth: 0,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '64%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: context => slices[context[0].dataIndex].fullLabel,
                      label: context => formatProjectMetric(context.parsed, metric),
                    },
                  },
                },
              }}
            />
          </div>
          <ul className="grid max-h-40 min-w-0 gap-2 overflow-y-auto text-xs md:w-52 md:max-h-56 md:block md:space-y-2" aria-label="Project chart legend">
            {slices.map((slice, index) => (
              <li key={`${slice.fullLabel}-${index}`} className="flex min-w-0 items-center gap-2" title={slice.fullLabel}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[index] }} />
                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{slice.label}</span>
                <span className="ml-auto font-mono" style={{ color: 'var(--text-primary)' }}>
                  {formatProjectMetric(slice.value, metric)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
