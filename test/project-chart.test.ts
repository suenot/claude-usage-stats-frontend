import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProjectEntry } from '../src/lib/api.ts';
import {
  breakdownSlices,
  breakdownTooltipLines,
  formatBreakdownValues,
  formatProjectMetric,
  projectModelColors,
  projectLabel,
  projectSlices,
} from '../src/lib/project-chart.ts';

const projects: ProjectEntry[] = [
  { cwd: '/Users/alex/work/alpha', cost: 4.2, tokens: 420, sessions: 2, sources: [], models: [], byModel: {}, byHarness: {} },
  { cwd: '/Users/alex/work/bravo', cost: 12.5, tokens: 125, sessions: 1, sources: [], models: [], byModel: {}, byHarness: {} },
  { cwd: '/Users/alex/work/charlie', cost: 0, tokens: 900, sessions: 3, sources: [], models: [], byModel: {}, byHarness: {} },
  { cwd: '(no project)', cost: 1.25, tokens: 0, sessions: 1, sources: [], models: [], byModel: {}, byHarness: {} },
];

test('sorts project slices by the selected metric and filters zero values', () => {
  assert.deepEqual(
    projectSlices(projects, 'usd').map(({ label, value }) => ({ label, value })),
    [
      { label: 'bravo', value: 12.5 },
      { label: 'alpha', value: 4.2 },
      { label: '(no project)', value: 1.25 },
    ],
  );
  assert.deepEqual(
    projectSlices(projects, 'tokens').map(({ label, value }) => ({ label, value })),
    [
      { label: 'charlie', value: 900 },
      { label: 'alpha', value: 420 },
      { label: 'bravo', value: 125 },
    ],
  );
});

test('keeps at most nine individual projects and sums the remainder into Other', () => {
  const many = Array.from({ length: 11 }, (_, i): ProjectEntry => ({
    cwd: `/work/project-${i + 1}`,
    cost: 11 - i,
    tokens: (11 - i) * 100,
    sessions: 1,
    sources: [],
    models: [],
    byModel: {},
    byHarness: {},
  }));

  const slices = projectSlices(many, 'usd');

  assert.deepEqual(slices.slice(0, 9).map(slice => slice.label), [
    'project-1', 'project-2', 'project-3', 'project-4', 'project-5',
    'project-6', 'project-7', 'project-8', 'project-9',
  ]);
  assert.deepEqual(slices[9], { label: 'Other', fullLabel: 'Other', value: 3 });
});

test('does not mutate project input while preparing slices', () => {
  const source = structuredClone(projects);

  projectSlices(projects, 'usd');

  assert.deepEqual(projects, source);
});

test('creates concise project labels while preserving the no-project marker', () => {
  assert.equal(projectLabel('/Users/alex/work/alpha/'), 'alpha');
  assert.equal(projectLabel('C:\\work\\bravo'), 'bravo');
  assert.equal(projectLabel('(no project)'), '(no project)');
  assert.equal(projectLabel(''), '(no project)');
});

test('formats USD and token values for chart tooltips', () => {
  assert.equal(formatProjectMetric(12.345, 'usd'), '$12.35');
  assert.equal(formatProjectMetric(1234567.8, 'tokens'), '1,234,568 tokens');
});

const breakdown = {
  alpha: { usd: 4.2, tokens: 420, sessions: 2 },
  bravo: { usd: 12.5, tokens: 125, sessions: 1 },
  charlie: { usd: 0, tokens: 900, sessions: 3 },
};

test('sorts breakdown slices by the selected metric and filters selected-metric zeroes', () => {
  assert.deepEqual(
    breakdownSlices(breakdown, 'usd').map(({ label, usd, tokens }) => ({ label, usd, tokens })),
    [
      { label: 'bravo', usd: 12.5, tokens: 125 },
      { label: 'alpha', usd: 4.2, tokens: 420 },
    ],
  );
  assert.deepEqual(
    breakdownSlices(breakdown, 'tokens').map(({ label, usd, tokens }) => ({ label, usd, tokens })),
    [
      { label: 'charlie', usd: 0, tokens: 900 },
      { label: 'alpha', usd: 4.2, tokens: 420 },
      { label: 'bravo', usd: 12.5, tokens: 125 },
    ],
  );
});

test('keeps eight breakdown series and aggregates all Other values', () => {
  const many = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `series-${i + 1}`,
      { usd: 10 - i, tokens: (i + 1) * 100, sessions: i + 1 },
    ]),
  );

  const slices = breakdownSlices(many, 'usd');

  assert.deepEqual(slices.slice(0, 8).map(slice => slice.label), [
    'series-1', 'series-2', 'series-3', 'series-4',
    'series-5', 'series-6', 'series-7', 'series-8',
  ]);
  assert.deepEqual(slices[8], {
    label: 'Other',
    usd: 3,
    tokens: 1900,
    sessions: 19,
  });
});

test('does not mutate breakdown input while preparing slices', () => {
  const source = structuredClone(breakdown);

  breakdownSlices(breakdown, 'tokens');

  assert.deepEqual(breakdown, source);
});

test('formats both breakdown values and puts the selected metric first in tooltips', () => {
  const values = { usd: 12.345, tokens: 1234567.8, sessions: 3 };

  assert.equal(formatBreakdownValues(values), '$12.35 · 1,234,568 tokens');
  assert.deepEqual(breakdownTooltipLines(values, 'usd'), [
    'USD: $12.35',
    'Tokens: 1,234,568 tokens',
  ]);
  assert.deepEqual(breakdownTooltipLines(values, 'tokens'), [
    'Tokens: 1,234,568 tokens',
    'USD: $12.35',
  ]);
});

test('assigns deterministic model colors from the complete project model set', () => {
  const sonnet45 = 'claude-sonnet-4-5';
  const sonnet46 = 'claude-sonnet-4-6';
  const opus46 = 'claude-opus-4-6';
  const allLabels = [sonnet46, opus46, sonnet45];

  const usdOrder = [sonnet45, opus46, sonnet46];
  const tokenOrder = [sonnet46, opus46];
  const usdPalette = projectModelColors(usdOrder, allLabels);
  const tokenPalette = projectModelColors(tokenOrder, [...allLabels].reverse());
  const usdColors = Object.fromEntries(
    usdOrder.map((label, index) => [label, usdPalette[index]]),
  );
  const tokenColors = Object.fromEntries(
    tokenOrder.map((label, index) => [label, tokenPalette[index]]),
  );

  assert.equal(usdColors[sonnet46], tokenColors[sonnet46]);
  assert.equal(usdColors[opus46], tokenColors[opus46]);
  assert.notEqual(usdColors[sonnet45], usdColors[sonnet46]);
  assert.equal(projectModelColors(['Other'], allLabels)[0], '#64748b');
});
