import type { UsageBreakdown, UsageBreakdownEntry } from './api';

export type UsageMetric = 'usd' | 'tokens';

export interface UsageSlice {
  label: string;
  stats: UsageBreakdownEntry;
  value: number;
}

export function usageSlices(usage: UsageBreakdown, metric: UsageMetric): UsageSlice[] {
  return Object.entries(usage)
    .map(([label, stats]) => ({
      label,
      stats,
      value: metric === 'usd' ? stats.cost : stats.tokens,
    }))
    .filter(slice => slice.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

export function formatUsageMetric(value: number, metric: UsageMetric): string {
  return metric === 'usd'
    ? `$${value.toFixed(2)}`
    : `${Math.round(value).toLocaleString('en-US')} tokens`;
}

export function formatUsageSummary(stats: UsageBreakdownEntry, metric: UsageMetric): string {
  const sessions = `${stats.sessions.toLocaleString('en-US')} sessions`;
  const usd = formatUsageMetric(stats.cost, 'usd');
  const tokens = formatUsageMetric(stats.tokens, 'tokens');
  return metric === 'usd'
    ? `${usd} - ${sessions} - ${tokens}`
    : `${tokens} - ${sessions} - ${usd}`;
}
