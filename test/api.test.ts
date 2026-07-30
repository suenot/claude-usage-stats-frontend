import assert from 'node:assert/strict';
import test from 'node:test';

import { api } from '../src/lib/api.ts';

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
