import type { ProjectEntry } from './api';

export type ProjectMetric = 'usd' | 'tokens';

export interface ProjectSlice {
  label: string;
  fullLabel: string;
  value: number;
}

const MAX_PROJECTS = 9;

export function projectLabel(cwd: string): string {
  if (!cwd || cwd === '(no project)') return '(no project)';
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || cwd;
}

export function projectSlices(projects: ProjectEntry[], metric: ProjectMetric): ProjectSlice[] {
  const valueFor = (project: ProjectEntry) => metric === 'usd' ? project.cost : project.tokens;
  const sorted = projects
    .filter(project => valueFor(project) > 0)
    .map(project => ({
      label: projectLabel(project.cwd),
      fullLabel: project.cwd || '(no project)',
      value: valueFor(project),
    }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= MAX_PROJECTS) return sorted;

  const otherValue = sorted.slice(MAX_PROJECTS).reduce((sum, slice) => sum + slice.value, 0);
  return [
    ...sorted.slice(0, MAX_PROJECTS),
    { label: 'Other', fullLabel: 'Other', value: otherValue },
  ];
}

export function formatProjectMetric(value: number, metric: ProjectMetric): string {
  return metric === 'usd'
    ? `$${value.toFixed(2)}`
    : `${Math.round(value).toLocaleString()} tokens`;
}
