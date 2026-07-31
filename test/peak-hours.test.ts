import assert from 'node:assert/strict';
import test from 'node:test';

import type { HeatmapEntry } from '../src/lib/api.ts';
import { buildPeakHoursAnalytics, formatHour } from '../src/lib/peak-hours.ts';

const entries: HeatmapEntry[] = [
  { date: '2026-07-29', hour: 10, cost: 1, sessions: 1 },
  { date: '2026-07-30', hour: 10, cost: 1, sessions: 1 },
  { date: '2026-07-31', hour: 10, cost: 1, sessions: 1 },
  { date: '2026-07-29', hour: 18, cost: 9, sessions: 1 },
];

test('separates recurring hours from a one-day cost spike', () => {
  const analytics = buildPeakHoursAnalytics(entries);

  assert.equal(analytics.activeDays, 3);
  assert.equal(analytics.mostConsistentHour, 10);
  assert.ok(Math.abs(analytics.peakRepeatabilityPct - 100 / 3) < 1e-10);
  assert.equal(analytics.spikeDependencyPct, 75);
  assert.deepEqual(analytics.recurringHours.map(hour => [hour.hour, hour.activeDays]), [
    [10, 3],
    [18, 1],
  ]);
});

test('aggregates duplicate cells and resolves ties by cost share then hour', () => {
  const analytics = buildPeakHoursAnalytics([
    { date: '2026-07-30', hour: 9, cost: 2, sessions: 1 },
    { date: '2026-07-30', hour: 9, cost: 3, sessions: 1 },
    { date: '2026-07-30', hour: 8, cost: 4, sessions: 1 },
  ]);

  assert.equal(analytics.mostConsistentHour, 9);
  assert.equal(analytics.recurringHours[0].costSharePct, 5 / 9 * 100);
  assert.equal(analytics.spikeDependencyPct, 5 / 9 * 100);
});

test('ignores invalid values without mutating input', () => {
  const source: HeatmapEntry[] = [
    { date: '2026-07-30', hour: 24, cost: 100, sessions: 1 },
    { date: '2026-07-30', hour: 12, cost: Number.NaN, sessions: 1 },
  ];
  const snapshot = source.map(entry => ({ ...entry }));
  const analytics = buildPeakHoursAnalytics(source);

  assert.equal(analytics.activeDays, 1);
  assert.equal(analytics.peakRepeatabilityPct, 0);
  assert.equal(analytics.spikeDependencyPct, 0);
  assert.equal(analytics.mostConsistentHour, 12);
  assert.deepEqual(source, snapshot);
});

test('normalizes recurrence for partial boundary days', () => {
  const analytics = buildPeakHoursAnalytics([
    { date: '2026-07-30', hour: 12, cost: 2, sessions: 1 },
    { date: '2026-07-31', hour: 8, cost: 1, sessions: 1 },
  ], {
    from: '2026-07-30T12:00',
    to: '2026-07-31T11:59',
  });

  assert.equal(analytics.activeDays, 2);
  assert.equal(analytics.recurringHours.find(hour => hour.hour === 12)?.recurrencePct, 100);
  assert.equal(analytics.recurringHours.find(hour => hour.hour === 8)?.recurrencePct, 100);
});

test('resolves equal-cost peaks by recurrence regardless of input order', () => {
  const source: HeatmapEntry[] = [
    { date: '2026-07-29', hour: 18, cost: 5, sessions: 1 },
    { date: '2026-07-30', hour: 10, cost: 5, sessions: 1 },
    { date: '2026-07-31', hour: 10, cost: 1, sessions: 1 },
  ];

  const expected = 100 / 3 * 2;
  assert.ok(Math.abs(buildPeakHoursAnalytics(source).peakRepeatabilityPct - expected) < 1e-10);
  assert.ok(Math.abs(buildPeakHoursAnalytics([...source].reverse()).peakRepeatabilityPct - expected) < 1e-10);
});

test('returns a stable empty state and formats hours', () => {
  assert.deepEqual(buildPeakHoursAnalytics([]), {
    activeDays: 0,
    mostConsistentHour: null,
    peakRepeatabilityPct: 0,
    spikeDependencyPct: 0,
    recurringHours: [],
  });
  assert.equal(formatHour(null), '--');
  assert.equal(formatHour(9), '09:00');
});
