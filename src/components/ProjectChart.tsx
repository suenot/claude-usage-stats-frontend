import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import type { ProjectEntry } from '../lib/api';
import { formatCompactProjectMetric, formatProjectMetric, projectSlices, type ProjectMetric } from '../lib/project-chart';

ChartJS.register(ArcElement, Tooltip);

const PAPER = '#F4F4F0';
const INK = '#111111';
const LINE = '#1B1B1B';
const RED = '#BC1010';
const CHART_COLORS = [RED, INK, '#66645F', '#94918A', '#B5B2AA', '#D0CEC6', '#7E7A73', '#3D3C38', '#AAA69E', '#DEDDD7'];

interface ProjectChartProps {
  data: ProjectEntry[] | null;
  loading: boolean;
}

export function ProjectChart({ data, loading }: ProjectChartProps) {
  const [metric, setMetric] = useState<ProjectMetric>('usd');

  if (loading) {
    return (
      <section aria-label="Loading project distribution" className="animate-pulse border border-[#1B1B1B] p-4">
        <div className="h-3 w-24 bg-[#DEDDD7]" />
        <div className="mt-4 h-56 bg-[#DEDDD7]" />
      </section>
    );
  }

  if (!data) {
    return (
      <section aria-labelledby="project-distribution-heading" className="border border-[#1B1B1B] p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BC1010]">All projects</p>
        <h3 id="project-distribution-heading" className="mt-1 text-xl font-black uppercase tracking-[-0.04em] text-[#111111]">Distribution</h3>
        <p className="mt-8 border-t border-[#1B1B1B] pt-3 font-mono text-xs text-[#66645F]">Project distribution is unavailable.</p>
      </section>
    );
  }

  const slices = projectSlices(data, metric);

  return (
    <section aria-labelledby="project-distribution-heading" className="border border-[#1B1B1B] bg-[#F4F4F0]">
      <div className="flex items-start justify-between gap-3 border-b border-[#1B1B1B] p-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BC1010]">All projects</p>
          <h3 id="project-distribution-heading" className="mt-1 text-xl font-black uppercase tracking-[-0.04em] text-[#111111]">Distribution</h3>
        </div>
        <div role="group" aria-label="Project chart metric" className="grid shrink-0 border border-[#1B1B1B]">
          {(['usd', 'tokens'] as const).map(option => {
            const selected = metric === option;
            return (
              <button key={option} type="button" aria-pressed={selected} onClick={() => setMetric(option)} className={`min-h-11 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010] ${selected ? 'bg-[#BC1010] text-[#F4F4F0]' : 'bg-[#F4F4F0] text-[#111111] hover:bg-[#DEDDD7]'}`}>
                {option === 'usd' ? 'USD' : 'Tokens'}
              </button>
            );
          })}
        </div>
      </div>

      {slices.length === 0 ? (
        <p className="p-4 font-mono text-xs text-[#66645F]">No project usage for this metric.</p>
      ) : (
        <div className="min-w-0">
          <div className="h-64 min-w-0 border-b border-[#1B1B1B] p-4">
            <Doughnut
              data={{ labels: slices.map(slice => slice.label), datasets: [{ data: slices.map(slice => slice.value), backgroundColor: slices.map((_, index) => CHART_COLORS[index]), borderColor: PAPER, borderWidth: 2 }] }}
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
                      title: context => slices[context[0].dataIndex].fullLabel,
                      label: context => formatProjectMetric(context.parsed, metric),
                    },
                  },
                },
              }}
            />
          </div>
          <ul className="min-w-0 divide-y divide-[#1B1B1B]" aria-label="Project chart legend">
            {slices.map((slice, index) => (
              <li key={`${slice.fullLabel}-${index}`} className="flex min-w-0 gap-2 px-3 py-2.5">
                <span className="mt-0.5 h-8 w-1.5 shrink-0" style={{ background: CHART_COLORS[index] }} />
                <span className="min-w-0">
                  <span className="block break-words font-mono text-[10px] font-semibold uppercase leading-4 tracking-[0.04em] text-[#111111] [overflow-wrap:anywhere]" title={slice.fullLabel}>{slice.label}</span>
                  <span aria-label={formatProjectMetric(slice.value, metric)} className="block break-words font-mono text-[10px] leading-4 text-[#66645F] [overflow-wrap:anywhere]">{formatCompactProjectMetric(slice.value, metric)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
