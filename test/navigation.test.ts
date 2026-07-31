import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidPublicHandle,
  parseRoute,
  pathForTab,
  routeKindFromPath,
  shouldHandleSpaNavigation,
  tabFromPath,
} from '../src/lib/navigation.ts';

test('classifies public, protected, callback and missing routes', () => {
  assert.deepEqual(parseRoute('/'), { kind: 'landing' });
  assert.deepEqual(parseRoute('/auth/callback'), { kind: 'callback' });
  assert.deepEqual(parseRoute('/users/'), { kind: 'leaderboard' });
  assert.deepEqual(parseRoute('/u/Suenot'), { kind: 'public-profile', handle: 'suenot' });
  assert.deepEqual(parseRoute('/profile'), { kind: 'profile' });
  assert.deepEqual(parseRoute('/models/'), { kind: 'app', tab: 'models' });
  assert.deepEqual(parseRoute('/not-a-page'), { kind: 'not-found' });

  assert.equal(routeKindFromPath('/u/mark'), 'public');
  assert.equal(routeKindFromPath('/users'), 'public');
  assert.equal(routeKindFromPath('/profile'), 'protected');
  assert.equal(routeKindFromPath('/dashboard'), 'protected');
  assert.equal(routeKindFromPath('/missing'), 'not-found');
});

test('validates canonical public handles and rejects system names', () => {
  assert.equal(isValidPublicHandle('suenot'), true);
  assert.equal(isValidPublicHandle('mark-42'), true);
  assert.equal(isValidPublicHandle('a'), false);
  assert.equal(isValidPublicHandle('bad_handle'), false);
  assert.equal(isValidPublicHandle('bad--handle'), false);
  assert.equal(isValidPublicHandle('-bad'), false);
  assert.equal(isValidPublicHandle('users'), false);
  assert.equal(isValidPublicHandle('a'.repeat(41)), false);
  assert.deepEqual(parseRoute('/u/bad%2Fhandle'), { kind: 'not-found' });
});

test('maps supported tabs without treating unknown paths as app routes', () => {
  assert.equal(tabFromPath('/models'), 'models');
  assert.equal(tabFromPath('/projects/'), 'projects');
  assert.equal(tabFromPath('/not-a-page'), 'dashboard');
  assert.equal(pathForTab('dashboard'), '/dashboard');
  assert.equal(pathForTab('sessions'), '/sessions');
});

test('only intercepts unmodified primary-link navigation', () => {
  assert.equal(shouldHandleSpaNavigation({ button: 0 }), true);
  assert.equal(shouldHandleSpaNavigation({ button: 1 }), false);
  assert.equal(shouldHandleSpaNavigation({ button: 0, metaKey: true }), false);
  assert.equal(shouldHandleSpaNavigation({ button: 0, ctrlKey: true }), false);
  assert.equal(shouldHandleSpaNavigation({ button: 0, shiftKey: true }), false);
  assert.equal(shouldHandleSpaNavigation({ button: 0, altKey: true }), false);
});
