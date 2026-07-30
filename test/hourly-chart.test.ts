import assert from 'node:assert/strict';
import test from 'node:test';

import type { HourlyEntry } from '../src/lib/api.ts';
import { buildHourlyDistribution } from '../src/lib/hourly-chart.ts';

const hours: HourlyEntry[] = [
  { hour: 2, cost: 3, sessions: 2, input_tokens: 20, output_tokens: 10, cache_read: 70, cache_write: 0 },
  { hour: 0, cost: 1, sessions: 1, input_tokens: 5, output_tokens: 5, cache_read: 0, cache_write: 0 },
  { hour: 1, cost: 0, sessions: 0, input_tokens: 0, output_tokens: 0, cache_read: 0, cache_write: 0 },
];

test('builds chronological cost slices with totals, percentages, and peak', () => {
  const distribution = buildHourlyDistribution(hours, 'cost');

  assert.equal(distribution.total, 4);
  assert.deepEqual(distribution.slices.map(slice => ({
    hour: slice.hour,
    label: slice.label,
    value: slice.value,
    percentage: slice.percentage,
  })), [
    { hour: 0, label: '00:00', value: 1, percentage: 25 },
    { hour: 2, label: '02:00', value: 3, percentage: 75 },
  ]);
  assert.equal(distribution.peak?.hour, 2);
});

test('uses only visible token series and excludes zero-value hours', () => {
  const distribution = buildHourlyDistribution(
    hours,
    'tokens',
    new Set(['cache_read', 'cache_write']),
  );

  assert.equal(distribution.total, 40);
  assert.deepEqual(distribution.slices.map(slice => [slice.hour, slice.value]), [
    [0, 10],
    [2, 30],
  ]);
  assert.equal(distribution.peak?.tokens, 30);
});

test('returns an empty distribution without NaN when all token series are hidden', () => {
  const distribution = buildHourlyDistribution(
    hours,
    'tokens',
    new Set(['cache_read', 'cache_write', 'input_tokens', 'output_tokens']),
  );

  assert.deepEqual(distribution, { slices: [], total: 0, peak: null });
});

test('does not mutate hourly API data', () => {
  const source = structuredClone(hours);

  buildHourlyDistribution(hours, 'tokens', new Set(['cache_read']));

  assert.deepEqual(hours, source);
});
