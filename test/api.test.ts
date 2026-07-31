import assert from 'node:assert/strict';
import test from 'node:test';

import { api, ApiError, publicApi } from '../src/lib/api.ts';

test('collects data through the backend POST endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let request: { input: string | URL | Request; init?: RequestInit } | undefined;

  globalThis.fetch = async (input, init) => {
    request = { input, init };
    return Response.json({ message: 'Data refreshed', sessions: 3 });
  };

  try {
    const result = await api.collectData();

    assert.equal(request?.input, '/api/collect');
    assert.equal(request?.init?.method, 'POST');
    assert.deepEqual(result, { message: 'Data refreshed', sessions: 3 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses the central public registry and encodes handles and leaderboard options', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<string | URL | Request> = [];
  globalThis.fetch = async input => {
    requests.push(input);
    return Response.json(input.toString().includes('leaderboard')
      ? { metric: 'tokens', users: [] }
      : { handle: 'mark-1', display_name: 'Mark', visibility: 'totals', snapshot: {} });
  };
  try {
    await publicApi.getUser('mark-1');
    await publicApi.getLeaderboard('tokens', 25);
    assert.deepEqual(requests, [
      'https://harness-analyzer-api.marketmaker.cc/api/public/users/mark-1',
      'https://harness-analyzer-api.marketmaker.cc/api/public/leaderboard?metric=tokens&limit=25',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('preserves backend error details and status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'Handle is already reserved' }, { status: 409 });
  try {
    await assert.rejects(
      () => publicApi.updateSharing({ handle: 'taken' }),
      error => error instanceof ApiError && error.status === 409 && error.message.includes('Handle is already reserved'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requests range-dependent charts with the selected range', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<string | URL | Request> = [];

  globalThis.fetch = async input => {
    requests.push(input);
    return Response.json({});
  };

  try {
    const range = { from: '2026-07-01T10:00', to: '2026-07-31T23:59' };

    await api.getSourceUsage(range);
    await api.getModelUsage(range);
    await api.getHourly(range);
    await api.getCache(range);
    await api.getCacheExpiry(range);
    await api.getHeatmap(range);

    assert.deepEqual(requests, [
      '/api/charts/source-usage?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/model-usage?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/hourly?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/cache?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/cache-expiry?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/heatmap?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
