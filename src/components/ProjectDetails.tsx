import { useState } from 'react';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ProjectBreakdownEntry, ProjectEntry } from '../lib/api';
import { colorForModel, colorForSource } from '../lib/model-colors';
import {
  breakdownSlices,
  breakdownTooltipLines,
  formatBreakdownValues,
  formatProjectMetric,
  projectModelColors,
  type ProjectMetric,
} from '../lib/project-chart';

ChartJS.register(ArcElement, Tooltip);

const PAPER = '#F4F4F0';
const INK = '#111111';
const LINE = '#1B1B1B';

interface BreakdownChartProps {
  breakdown: Record<string, ProjectBreakdownEntry>;
  colorFor: (label: string) => string;
  metric: ProjectMetric;
  modelShades?: boolean;
  title: string;
  unit: string;
}

function BreakdownChart({ breakdown, colorFor, metric, modelShades = false, title, unit }: BreakdownChartProps) {
  const slices = breakdownSlices(breakdown, metric);
  const colors = modelShades
    ? projectModelColors(slices.map(slice => slice.label), Object.keys(breakdown))
    : slices.map(slice => colorFor(slice.label));

  return (
    <section className="min-w-0 border border-[#1B1B1B] bg-[#F4F4F0]">
      <header className="flex items-start justify-between gap-3 border-b border-[#1B1B1B] p-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BC1010]">{unit}</p>
          <h4 className="mt-1 text-lg font-black uppercase tracking-[-0.04em] text-[#111111]">{title}</h4>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#66645F]">{slices.length} series</p>
      </header>
      {slices.length === 0 ? (
        <p className="p-4 font-mono text-xs text-[#66645F]">No usage for this metric.</p>
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="h-64 min-w-0 border-b border-[#1B1B1B] p-4 lg:h-auto lg:min-h-72 lg:border-b-0 lg:border-r">
            <Doughnut
              data={{ labels: slices.map(slice => slice.label), datasets: [{ data: slices.map(slice => slice[metric]), backgroundColor: colors, borderColor: PAPER, borderWidth: 2 }] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: PAPER,
                    titleColor: INK,
                    bodyColor: INK,
                    borderColor: LINE,
                    borderWidth: 1,
                    titleFont: { family: 'JetBrains Mono, monospace', weight: 'bold' },
                    bodyFont: { family: 'JetBrains Mono, monospace' },
                    callbacks: {
                      title: context => slices[context[0].dataIndex].label,
                      label: context => breakdownTooltipLines(slices[context.dataIndex], metric),
                    },
                  },
                },
              }}
            />
          </div>
          <ul className="min-w-0 divide-y divide-[#1B1B1B]" aria-label={`${title} legend`}>
            {slices.map((slice, index) => (
              <li key={slice.label} className="grid min-w-0 grid-cols-[6px_minmax(0,1fr)] gap-x-2 px-3 py-2.5">
                <span className="row-span-2 mt-0.5 h-8 w-1.5" style={{ background: colors[index] }} />
                <span className="min-w-0 break-words font-mono text-[10px] font-semibold uppercase leading-4 tracking-[0.04em] text-[#111111] [overflow-wrap:anywhere]">{slice.label}</span>
                <span className="min-w-0 break-words font-mono text-[10px] leading-4 text-[#66645F] [overflow-wrap:anywhere]">{formatBreakdownValues(slice)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
    <div id={id} role="region" aria-label={`${project.cwd} details`} className="min-w-0 border-t-[3px] border-[#111111] bg-[#DEDDD7] p-4 sm:p-5">
      <div className="flex flex-col gap-4 border-b border-[#1B1B1B] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BC1010]">Unit breakdown</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-7">
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">USD</dt>
              <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-[#BC1010]">{formatProjectMetric(project.cost, 'usd')}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">Tokens</dt>
              <dd className="mt-1 break-words font-mono text-sm font-bold tabular-nums text-[#111111] [overflow-wrap:anywhere]">{formatProjectMetric(project.tokens, 'tokens')}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">Sessions</dt>
              <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-[#111111]">{project.sessions.toLocaleString('en-US')}</dd>
            </div>
          </dl>
        </div>
        <div role="group" aria-label="Project breakdown metric" className="grid w-fit grid-cols-2 border border-[#1B1B1B]">
          {(['usd', 'tokens'] as const).map(option => {
            const selected = metric === option;
            return (
              <button key={option} type="button" aria-pressed={selected} onClick={() => setMetric(option)} className={`min-h-11 px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010] ${selected ? 'bg-[#BC1010] text-[#F4F4F0]' : 'bg-[#F4F4F0] text-[#111111] hover:bg-[#111111] hover:text-[#F4F4F0]'}`}>
                {option === 'usd' ? 'USD' : 'Tokens'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
        <BreakdownChart breakdown={project.byModel} colorFor={colorForModel} metric={metric} modelShades title="By model" unit="Model matrix" />
        <BreakdownChart breakdown={project.byHarness} colorFor={colorForSource} metric={metric} title="By harness" unit="Harness matrix" />
      </div>
    </div>
  );
}
