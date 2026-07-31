import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAuthorizeUrl,
  createLoginUrl,
  exchangeSsoCode,
  hasPrivateAnalyticsAccess,
  hasServiceAccess,
  safeInternalPath,
} from '../src/lib/auth';

test('keeps SSO return paths internal', () => {
  assert.equal(safeInternalPath('/models?sort=cost'), '/models?sort=cost');
  assert.equal(safeInternalPath('https://evil.example'), '/dashboard');
  assert.equal(safeInternalPath('//evil.example'), '/dashboard');
  assert.equal(safeInternalPath(undefined), '/dashboard');
});

test('builds authorize and login URLs without open redirects', () => {
  const authorize = new URL(createAuthorizeUrl(
    'https://auth.marketmaker.cc/api/v1/',
    'http://127.0.0.1:5173/auth/callback',
    '//evil.example',
  ));
  const login = new URL(createLoginUrl(
    'https://auth.marketmaker.cc/api/v1',
    'http://127.0.0.1:5173/',
  ));

  assert.equal(authorize.origin, 'https://auth.marketmaker.cc');
  assert.equal(authorize.pathname, '/api/v1/sso/authorize');
  assert.equal(authorize.searchParams.get('redirect_uri'), 'http://127.0.0.1:5173/auth/callback');
  assert.equal(authorize.searchParams.get('state'), '/dashboard');
  assert.equal(login.href, 'https://auth.marketmaker.cc/login?return=http%3A%2F%2F127.0.0.1%3A5173%2F');
});

test('accepts service users but keeps private analytics admin-only', () => {
  const base = {
    token: 'token',
    user_id: 'user-1',
    email: 'user@example.com',
    username: 'user',
  };

  assert.equal(hasServiceAccess({ ...base, services: { 'harness-analyzer': 'admin' } }, 'harness-analyzer'), true);
  assert.equal(hasServiceAccess({ ...base, services: { 'harness-analyzer': 'superuser' } }, 'harness-analyzer'), true);
  assert.equal(hasServiceAccess({ ...base, services: { 'harness-analyzer': 'user' } }, 'harness-analyzer'), true);
  assert.equal(hasPrivateAnalyticsAccess({ ...base, services: { 'harness-analyzer': 'admin' } }, 'harness-analyzer'), true);
  assert.equal(hasPrivateAnalyticsAccess({ ...base, services: { 'harness-analyzer': 'superuser' } }, 'harness-analyzer'), false);
  assert.equal(hasPrivateAnalyticsAccess({ ...base, services: { 'harness-analyzer': 'user' } }, 'harness-analyzer'), false);
  assert.equal(hasServiceAccess({ ...base, services: {} }, 'harness-analyzer'), false);
});

test('deduplicates a one-time SSO code exchange under Strict Mode', async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  const first = exchangeSsoCode('https://auth.marketmaker.cc/api/v1', 'single-use-code', 'http://127.0.0.1:5173/auth/callback', fetcher);
  const second = exchangeSsoCode('https://auth.marketmaker.cc/api/v1', 'single-use-code', 'http://127.0.0.1:5173/auth/callback', fetcher);

  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
  assert.equal(calls, 1);
});
