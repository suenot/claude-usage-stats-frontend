import assert from 'node:assert/strict';
import test from 'node:test';

import type { UsageBreakdown } from '../src/lib/api.ts';
import {
  formatUsageMetric,
  formatUsageSummary,
  usageSlices,
} from '../src/lib/usage-chart.ts';

const usage: UsageBreakdown = {
  Alpha: { cost: 12.5, sessions: 2, tokens: 125 },
  Bravo: { cost: 4.2, sessions: 3, tokens: 420 },
  Empty: { cost: 0, sessions: 1, tokens: 0 },
};

test('sorts usage by the selected metric and filters zero values', () => {
  assert.deepEqual(usageSlices(usage, 'usd').map(slice => [slice.label, slice.value]), [
    ['Alpha', 12.5],
    ['Bravo', 4.2],
  ]);
  assert.deepEqual(usageSlices(usage, 'tokens').map(slice => [slice.label, slice.value]), [
    ['Bravo', 420],
    ['Alpha', 125],
  ]);
});

test('does not mutate usage while preparing slices', () => {
  const source = structuredClone(usage);

  usageSlices(usage, 'tokens');

  assert.deepEqual(usage, source);
});

test('formats the selected metric first in summaries', () => {
  const stats = { cost: 12.5, sessions: 2, tokens: 1250 };

  assert.equal(formatUsageMetric(stats.cost, 'usd'), '$12.50');
  assert.equal(formatUsageMetric(stats.tokens, 'tokens'), '1,250 tokens');
  assert.equal(formatUsageSummary(stats, 'usd'), '$12.50 - 2 sessions - 1,250 tokens');
  assert.equal(formatUsageSummary(stats, 'tokens'), '1,250 tokens - 2 sessions - $12.50');
});
