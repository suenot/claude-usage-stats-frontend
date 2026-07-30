import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import type { ProjectEntry } from '../lib/api';
import {
  formatCompactProjectMetric,
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

  if (loading) {
    return (
      <section aria-label="Loading project distribution" className="rounded-2xl p-4 animate-pulse sm:p-5" style={{ background: 'var(--bg-card)' }}>
        <div className="h-5 w-28 rounded" style={{ background: 'var(--bg-secondary)' }} />
        <div className="mt-4 h-48 rounded-xl" style={{ background: 'var(--bg-secondary)' }} />
      </section>
    );
  }

  if (!data) {
    return (
      <section aria-labelledby="project-distribution-heading" className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)' }}>
        <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>All projects</p>
        <h3 id="project-distribution-heading" className="mt-0.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Project mix</h3>
        <div className="mt-4 flex h-48 items-center justify-center rounded-xl text-sm" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
          Project distribution is unavailable
        </div>
      </section>
    );
  }

  const slices = projectSlices(data, metric);

  return (
    <section aria-labelledby="project-distribution-heading" className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>All projects</p>
          <h3 id="project-distribution-heading" className="mt-0.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Project mix</h3>
        </div>
        <div
          role="group"
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
                className="min-h-11 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.98]"
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
        <div className="flex h-48 items-center justify-center rounded-xl text-sm" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
          No project usage yet
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-48 min-w-0 flex-1 sm:h-52">
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
          <ul className="grid min-w-0 gap-2 text-xs sm:w-48 sm:block sm:space-y-2" aria-label="Project chart legend">
            {slices.map((slice, index) => (
              <li key={`${slice.fullLabel}-${index}`} className="flex min-w-0 items-center gap-2" title={slice.fullLabel}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[index] }} />
                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{slice.label}</span>
                <span
                  aria-label={formatProjectMetric(slice.value, metric)}
                  className="ml-auto shrink-0 font-mono"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {formatCompactProjectMetric(slice.value, metric)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
