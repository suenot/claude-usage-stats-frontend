import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAuthorizeUrl,
  createLoginUrl,
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

test('requires an explicit admin role for Harness Analyzer', () => {
  const base = {
    token: 'token',
    user_id: 'user-1',
    email: 'user@example.com',
    username: 'user',
  };

  assert.equal(hasServiceAccess({ ...base, services: { 'harness-analyzer': 'admin' } }, 'harness-analyzer'), true);
  assert.equal(hasServiceAccess({ ...base, services: { 'harness-analyzer': 'viewer' } }, 'harness-analyzer'), false);
  assert.equal(hasServiceAccess({ ...base, services: {} }, 'harness-analyzer'), false);
});
