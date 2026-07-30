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

const MAX_PROJECTS = 9;
const MAX_BREAKDOWN_SERIES = 8;
const OTHER_MODEL_COLOR = '#64748b';

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
