import type { ProjectBreakdownEntry, ProjectEntry } from './api';
import { colorForModel, modelFamilyFor, shade } from './model-colors';

export type ProjectMetric = 'usd' | 'tokens';

export interface ProjectSlice {
  label: string;
  fullLabel: string;
  value: number;
}

export interface BreakdownSlice extends ProjectBreakdownEntry {
  label: string;
}

export type ProjectSort = 'cost' | 'tokens' | 'sessions' | 'name';

export interface ProjectTotals {
  projects: number;
  cost: number;
  tokens: number;
  sessions: number;
}

const MAX_PROJECTS = 9;
const MAX_BREAKDOWN_SERIES = 8;
const OTHER_MODEL_COLOR = '#64748b';

export function projectLabel(cwd: string): string {
  if (!cwd || cwd === '(no project)') return '(no project)';
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || cwd;
}

export function projectTotals(projects: readonly ProjectEntry[]): ProjectTotals {
  return projects.reduce<ProjectTotals>((totals, project) => ({
    projects: totals.projects + 1,
    cost: totals.cost + project.cost,
    tokens: totals.tokens + project.tokens,
    sessions: totals.sessions + project.sessions,
  }), { projects: 0, cost: 0, tokens: 0, sessions: 0 });
}

export function matchesProjectSearch(project: ProjectEntry, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const searchable = [
    project.cwd,
    projectLabel(project.cwd),
    ...project.sources,
    ...project.models,
    ...Object.keys(project.byModel),
    ...Object.keys(project.byHarness),
  ].join(' ').toLocaleLowerCase();

  return searchable.includes(normalizedQuery);
}

export function sortProjects(projects: readonly ProjectEntry[], sort: ProjectSort): ProjectEntry[] {
  return [...projects].sort((left, right) => {
    if (sort === 'name') {
      return projectLabel(left.cwd).localeCompare(projectLabel(right.cwd), undefined, { sensitivity: 'base' })
        || left.cwd.localeCompare(right.cwd, undefined, { sensitivity: 'base' });
    }

    const difference = sort === 'cost' ? right.cost - left.cost
      : sort === 'tokens' ? right.tokens - left.tokens
      : right.sessions - left.sessions;

    return difference || left.cwd.localeCompare(right.cwd, undefined, { sensitivity: 'base' });
  });
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

export function formatCompactProjectMetric(value: number, metric: ProjectMetric): string {
  if (metric === 'usd') return formatProjectMetric(value, metric);

  const units: Array<[number, string]> = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  const unit = units.find(([threshold]) => Math.abs(value) >= threshold);
  if (!unit) return formatProjectMetric(value, metric);

  const [threshold, suffix] = unit;
  const compact = value / threshold;
  const digits = compact >= 100 ? 0 : compact >= 10 ? 1 : 2;
  return `${Number(compact.toFixed(digits))}${suffix} tokens`;
}

export function breakdownSlices(
  breakdown: Record<string, ProjectBreakdownEntry>,
  metric: ProjectMetric,
): BreakdownSlice[] {
  const sorted = Object.entries(breakdown)
    .filter(([, values]) => values[metric] > 0)
    .map(([label, values]) => ({ label, ...values }))
    .sort((a, b) => b[metric] - a[metric]);

  if (sorted.length <= MAX_BREAKDOWN_SERIES) return sorted;

  const other = sorted.slice(MAX_BREAKDOWN_SERIES).reduce<ProjectBreakdownEntry>(
    (totals, slice) => ({
      usd: totals.usd + slice.usd,
      tokens: totals.tokens + slice.tokens,
      sessions: totals.sessions + slice.sessions,
    }),
    { usd: 0, tokens: 0, sessions: 0 },
  );

  return [
    ...sorted.slice(0, MAX_BREAKDOWN_SERIES),
    { label: 'Other', ...other },
  ];
}

export function formatBreakdownValues(values: ProjectBreakdownEntry): string {
  return `${formatProjectMetric(values.usd, 'usd')} · ${formatProjectMetric(values.tokens, 'tokens')}`;
}

export function breakdownTooltipLines(
  values: ProjectBreakdownEntry,
  metric: ProjectMetric,
): [string, string] {
  const usd = `USD: ${formatProjectMetric(values.usd, 'usd')}`;
  const tokens = `Tokens: ${formatProjectMetric(values.tokens, 'tokens')}`;
  return metric === 'usd' ? [usd, tokens] : [tokens, usd];
}

export function projectModelColors(
  labels: readonly string[],
  allLabels: readonly string[],
): string[] {
  const familyMembers: Record<string, string[]> = {};
  const stableLabels = [...new Set(allLabels.filter(label => label !== 'Other'))].sort();

  for (const label of stableLabels) {
    const family = modelFamilyFor(label);
    (familyMembers[family] ||= []).push(label);
  }

  return labels.map(label => {
    if (label === 'Other') return OTHER_MODEL_COLOR;

    const family = modelFamilyFor(label);
    const members = familyMembers[family] || [];
    const index = members.indexOf(label);
    if (index < 0 || members.length <= 1) return colorForModel(label);

    const factor = (index / (members.length - 1) - 0.5) * 0.5;
    return shade(colorForModel(label), factor);
  });
}
