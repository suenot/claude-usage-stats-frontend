import assert from 'node:assert/strict';
import test from 'node:test';

import type { ModelPrice } from '../src/lib/api.ts';
import {
  filterModelPrices,
  filterUsedModelPrices,
  formatPrice,
  normalizeModelId,
  selectModelPrices,
  sortModelPrices,
} from '../src/lib/model-pricing.ts';

const models: ModelPrice[] = [
  {
    id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'anthropic', contextLength: 200000,
    hasPricingOverrides: false, inputPerMillion: 5, outputPerMillion: 25, cacheReadPerMillion: null, cacheWritePerMillion: null,
  },
  {
    id: 'openai/gpt-5.6-luna', name: 'GPT-5.6 Luna', provider: 'openai', contextLength: null,
    hasPricingOverrides: false, inputPerMillion: null, outputPerMillion: 12, cacheReadPerMillion: 0.1, cacheWritePerMillion: null,
  },
  {
    id: 'anthropic/claude-opus-4.6:batch', name: 'Claude Opus 4.6 Batch', provider: 'anthropic', contextLength: 200000,
    hasPricingOverrides: false, inputPerMillion: 2.5, outputPerMillion: 12.5, cacheReadPerMillion: null, cacheWritePerMillion: null,
  },
];

test('filters by name, ID, and provider without changing the source array', () => {
  const source = [...models];

  assert.deepEqual(filterModelPrices(models, 'LUNA').map(model => model.id), ['openai/gpt-5.6-luna']);
  assert.deepEqual(filterModelPrices(models, 'anthropic').map(model => model.id), [
    'anthropic/claude-opus-4.6',
    'anthropic/claude-opus-4.6:batch',
  ]);
  assert.deepEqual(models, source);
});

test('sorts null values last in both directions without mutating the source array', () => {
  const source = [...models];

  assert.deepEqual(
    sortModelPrices(models, { key: 'inputPerMillion', direction: 'asc' }).map(model => model.id),
    ['anthropic/claude-opus-4.6:batch', 'anthropic/claude-opus-4.6', 'openai/gpt-5.6-luna'],
  );
  assert.deepEqual(
    sortModelPrices(models, { key: 'inputPerMillion', direction: 'desc' }).map(model => model.id),
    ['anthropic/claude-opus-4.6', 'anthropic/claude-opus-4.6:batch', 'openai/gpt-5.6-luna'],
  );
  assert.deepEqual(models, source);
});

test('formats missing, zero, and sub-cent prices distinctly', () => {
  assert.equal(formatPrice(null), '—');
  assert.equal(formatPrice(0), '$0');
  assert.equal(formatPrice(0.000125), '$0.000125');
});

test('normalizes usage IDs and keeps default Models results limited to exact used variants', () => {
  assert.equal(normalizeModelId('anthropic/claude-haiku-4.5-20251001'), 'claude-haiku-4-5');
  assert.equal(normalizeModelId('GLM 5.2'), 'glm-5-2');
  assert.deepEqual(
    filterUsedModelPrices(models, {
      'claude-opus-4-6': 4,
      'gpt-5.6-luna': 2,
    }).map(model => model.id),
    ['anthropic/claude-opus-4.6', 'openai/gpt-5.6-luna'],
  );
});

test('selects used models by default and the complete catalog when Show all is enabled', () => {
  const usageModels = { 'claude-opus-4-6': 4, 'gpt-5.6-luna': 2 };

  assert.deepEqual(
    selectModelPrices(models, usageModels, false).map(model => model.id),
    ['anthropic/claude-opus-4.6', 'openai/gpt-5.6-luna'],
  );
  assert.deepEqual(selectModelPrices(models, usageModels, true), models);
});
