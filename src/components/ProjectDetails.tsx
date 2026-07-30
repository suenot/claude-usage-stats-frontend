import { useState } from 'react';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ProjectBreakdownEntry, ProjectEntry } from '../lib/api';
import { colorForModel, colorForSource } from '../lib/model-colors';
import {
  breakdownSlices,
  breakdownTooltipLines,
  formatCompactProjectMetric,
  formatBreakdownValues,
  formatProjectMetric,
  projectModelColors,
  type ProjectMetric,
} from '../lib/project-chart';

ChartJS.register(ArcElement, Tooltip);

interface BreakdownChartProps {
  breakdown: Record<string, ProjectBreakdownEntry>;
  colorFor: (label: string) => string;
  metric: ProjectMetric;
  modelShades?: boolean;
  title: string;
}

function BreakdownChart({
  breakdown,
  colorFor,
  metric,
  modelShades = false,
  title,
}: BreakdownChartProps) {
  const slices = breakdownSlices(breakdown, metric);

  if (slices.length === 0) {
    return (
      <section className="min-w-0 rounded-xl p-4" style={{ background: 'var(--bg-primary)' }}>
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
        <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          No {title.toLowerCase()} usage for this metric
        </div>
      </section>
    );
  }

  const colors = modelShades
    ? projectModelColors(slices.map(slice => slice.label), Object.keys(breakdown))
    : slices.map(slice => colorFor(slice.label));

  return (
    <section className="min-w-0 overflow-hidden rounded-xl p-4" style={{ background: 'var(--bg-primary)' }}>
      <h4 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-48 min-w-0 flex-1">
          <Doughnut
            data={{
              labels: slices.map(slice => slice.label),
              datasets: [{
                data: slices.map(slice => slice[metric]),
                backgroundColor: colors,
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
                    title: context => slices[context[0].dataIndex].label,
                    label: context => breakdownTooltipLines(slices[context.dataIndex], metric),
                  },
                },
              },
            }}
          />
        </div>
        <ul
          aria-label={`${title} legend`}
          className="min-w-0 space-y-2 text-xs sm:w-48"
        >
          {slices.map((slice, index) => (
            <li key={slice.label} className="flex min-w-0 items-start gap-2">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index] }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate" title={slice.label} style={{ color: 'var(--text-secondary)' }}>
                  {slice.label}
                </span>
                <span className="block font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>
                  {formatBreakdownValues(slice)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface ProjectDetailsProps {
  id: string;
  project: ProjectEntry;
}

export function ProjectDetails({ id, project }: ProjectDetailsProps) {
  const [metric, setMetric] = useState<ProjectMetric>('usd');

  return (
    <div id={id} role="region" aria-label={`${project.cwd} details`} className="min-w-0 border-t p-4 sm:p-5" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-6">
          <div>
            <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>USD</dt>
            <dd className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-yellow)' }}>
              {formatProjectMetric(project.cost, 'usd')}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tokens</dt>
            <dd className="font-mono tabular-nums" title={formatProjectMetric(project.tokens, 'tokens')}>
              <span className="block text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                {formatCompactProjectMetric(project.tokens, 'tokens')}
              </span>
              <span className="mt-0.5 block break-words text-[10px] font-normal leading-4 [overflow-wrap:anywhere]" style={{ color: 'var(--text-secondary)' }}>
                Exact: {formatProjectMetric(project.tokens, 'tokens')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sessions</dt>
            <dd className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {project.sessions.toLocaleString()}
            </dd>
          </div>
        </dl>

        <div
          role="group"
          aria-label="Project breakdown metric"
          className="flex w-fit rounded-lg p-0.5"
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

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownChart
          breakdown={project.byModel}
          colorFor={colorForModel}
          metric={metric}
          modelShades
          title="By Model"
        />
        <BreakdownChart
          breakdown={project.byHarness}
          colorFor={colorForSource}
          metric={metric}
          title="By Harness"
        />
      </div>
    </div>
  );
}
