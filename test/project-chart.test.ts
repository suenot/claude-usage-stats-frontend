import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProjectEntry } from '../src/lib/api.ts';
import {
  formatProjectMetric,
  projectLabel,
  projectSlices,
} from '../src/lib/project-chart.ts';

const projects: ProjectEntry[] = [
  { cwd: '/Users/alex/work/alpha', cost: 4.2, tokens: 420, sessions: 2, sources: [], models: [] },
  { cwd: '/Users/alex/work/bravo', cost: 12.5, tokens: 125, sessions: 1, sources: [], models: [] },
  { cwd: '/Users/alex/work/charlie', cost: 0, tokens: 900, sessions: 3, sources: [], models: [] },
  { cwd: '(no project)', cost: 1.25, tokens: 0, sessions: 1, sources: [], models: [] },
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
