import type { HourlyEntry } from './api';

export type HourlyMetric = 'cost' | 'tokens';
export type HourlyTokenKey = 'cache_read' | 'cache_write' | 'input_tokens' | 'output_tokens';

export const HOURLY_TOKEN_KEYS: readonly HourlyTokenKey[] = [
  'cache_read',
  'cache_write',
  'input_tokens',
  'output_tokens',
];

export interface HourlySlice {
  hour: number;
  label: string;
  value: number;
  percentage: number;
  sessions: number;
  cost: number;
  tokens: number;
}

export interface HourlyDistribution {
  slices: HourlySlice[];
  total: number;
  peak: HourlySlice | null;
}

export function buildHourlyDistribution(
  hours: readonly HourlyEntry[],
  metric: HourlyMetric,
  hiddenTokenKeys: ReadonlySet<HourlyTokenKey> = new Set(),
): HourlyDistribution {
  const values = hours
    .map(hour => {
      const tokens = HOURLY_TOKEN_KEYS.reduce(
        (sum, key) => sum + (hiddenTokenKeys.has(key) ? 0 : hour[key]),
        0,
      );

      return {
        hour: hour.hour,
        label: `${String(hour.hour).padStart(2, '0')}:00`,
        value: metric === 'cost' ? hour.cost : tokens,
        sessions: hour.sessions,
        cost: hour.cost,
        tokens,
      };
    })
    .filter(slice => slice.value > 0)
    .sort((left, right) => left.hour - right.hour);

  const total = values.reduce((sum, slice) => sum + slice.value, 0);
  const slices = values.map(slice => ({
    ...slice,
    percentage: total > 0 ? (slice.value / total) * 100 : 0,
  }));
  const peak = slices.reduce<HourlySlice | null>(
    (best, slice) => !best || slice.value > best.value ? slice : best,
    null,
  );

  return { slices, total, peak };
}
