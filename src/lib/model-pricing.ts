import type { ModelPrice } from './api';

export type ModelPriceSortKey =
  | 'contextLength'
  | 'inputPerMillion'
  | 'cacheReadPerMillion'
  | 'cacheWritePerMillion'
  | 'outputPerMillion';

export function filterModelPrices(models: ModelPrice[], query: string): ModelPrice[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...models];

  return models.filter(model => [model.name, model.id, model.provider]
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery)));
}

export function sortModelPrices(
  models: ModelPrice[],
  sort: { key: ModelPriceSortKey; direction: 'asc' | 'desc' } | null,
): ModelPrice[] {
  if (!sort) return [...models];

  return [...models].sort((left, right) => {
    const leftValue = left[sort.key];
    const rightValue = right[sort.key];
    if (leftValue === null) return rightValue === null ? 0 : 1;
    if (rightValue === null) return -1;
    return (leftValue - rightValue) * (sort.direction === 'asc' ? 1 : -1);
  });
}

export function formatPrice(value: number | null): string {
  if (value === null) return '—';
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', {
    maximumFractionDigits: value < 1 ? 6 : 4,
  })}`;
}

export function formatContext(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('en-US');
}
