import assert from 'node:assert/strict';
import test from 'node:test';
import {
  centerChartViewport,
  defaultChartViewport,
  normalizeChartViewport,
  updateChartViewport,
} from '../src/lib/chart-viewport.ts';

test('opens the navigator on the latest preferred buckets', () => {
  assert.deepEqual(defaultChartViewport(100, 30), { start: 70, end: 100 });
  assert.deepEqual(defaultChartViewport(12, 30), { start: 0, end: 12 });
});

test('moves a chart viewport without changing its size or crossing bounds', () => {
  assert.deepEqual(updateChartViewport({ start: 10, end: 20 }, 'move', 5, 40), { start: 15, end: 25 });
  assert.deepEqual(updateChartViewport({ start: 10, end: 20 }, 'move', -50, 40), { start: 0, end: 10 });
  assert.deepEqual(updateChartViewport({ start: 30, end: 40 }, 'move', 50, 40), { start: 30, end: 40 });
});

test('resizes either edge while preserving a usable viewport', () => {
  assert.deepEqual(updateChartViewport({ start: 10, end: 20 }, 'start', 4, 40), { start: 14, end: 20 });
  assert.deepEqual(updateChartViewport({ start: 10, end: 20 }, 'start', 20, 40), { start: 17, end: 20 });
  assert.deepEqual(updateChartViewport({ start: 10, end: 20 }, 'end', -20, 40), { start: 10, end: 13 });
  assert.deepEqual(updateChartViewport({ start: 10, end: 20 }, 'end', 50, 40), { start: 10, end: 40 });
});

test('centers and normalizes viewports at dataset boundaries', () => {
  assert.deepEqual(centerChartViewport({ start: 10, end: 20 }, 2, 40), { start: 0, end: 10 });
  assert.deepEqual(centerChartViewport({ start: 10, end: 20 }, 38, 40), { start: 30, end: 40 });
  assert.deepEqual(normalizeChartViewport({ start: -4, end: 1 }, 2), { start: 0, end: 2 });
});
