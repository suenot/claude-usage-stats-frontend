import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalUserPath,
  isOwnUserHandle,
  isValidPublicHandle,
  parseRoute,
  pathForPublicProfile,
  pathForTab,
  pathForUserTab,
  routeKindFromPath,
  shouldHandleSpaNavigation,
  tabFromPath,
} from '../src/lib/navigation.ts';

test('classifies public, protected, callback and missing routes', () => {
  assert.deepEqual(parseRoute('/'), { kind: 'landing' });
  assert.deepEqual(parseRoute('/auth/callback'), { kind: 'callback' });
  assert.deepEqual(parseRoute('/users/'), { kind: 'leaderboard' });
  assert.deepEqual(parseRoute('/u/Suenot'), { kind: 'public-profile', handle: 'suenot', tab: 'dashboard' });
  assert.deepEqual(parseRoute('/u/Suenot/sessions/'), { kind: 'public-profile', handle: 'suenot', tab: 'sessions' });
  assert.deepEqual(parseRoute('/u/mark/projects'), { kind: 'public-profile', handle: 'mark', tab: 'projects' });
  assert.deepEqual(parseRoute('/u/mark/models'), { kind: 'not-found' });
  assert.deepEqual(parseRoute('/profile'), { kind: 'profile' });
  assert.deepEqual(parseRoute('/models/'), { kind: 'app', tab: 'models' });
  assert.deepEqual(parseRoute('/not-a-page'), { kind: 'not-found' });

  assert.equal(routeKindFromPath('/u/mark'), 'public');
  assert.equal(routeKindFromPath('/u/mark/sessions'), 'public');
  assert.equal(routeKindFromPath('/users'), 'public');
  assert.equal(routeKindFromPath('/profile'), 'protected');
  assert.equal(routeKindFromPath('/dashboard'), 'protected');
  assert.equal(routeKindFromPath('/missing'), 'not-found');
});

test('builds canonical public profile paths from persisted handles', () => {
  assert.equal(pathForPublicProfile(' Suenot '), '/u/suenot');
  assert.equal(pathForUserTab(' Suenot ', 'dashboard'), '/u/suenot');
  assert.equal(pathForUserTab(' Suenot ', 'sessions'), '/u/suenot/sessions');
  assert.equal(pathForUserTab('mark', 'projects'), '/u/mark/projects');
  assert.throws(() => pathForPublicProfile('bad/handle'), /Invalid public handle/);
});

test('canonicalizes legacy user routes without moving global models', () => {
  assert.equal(canonicalUserPath('/dashboard', 'suenot'), '/u/suenot');
  assert.equal(canonicalUserPath('/sessions/', 'suenot'), '/u/suenot/sessions');
  assert.equal(canonicalUserPath('/projects', 'suenot'), '/u/suenot/projects');
  assert.equal(canonicalUserPath('/models', 'suenot'), null);
  assert.equal(canonicalUserPath('/users', 'suenot'), null);
  assert.equal(canonicalUserPath('/u/Suenot/sessions/', 'mark'), '/u/suenot/sessions');
  assert.equal(canonicalUserPath('/u/suenot/sessions', 'mark'), null);
  assert.equal(canonicalUserPath('/sessions'), null);
});

test('matches private user routes only to their owner handle', () => {
  assert.equal(isOwnUserHandle('suenot', 'suenot'), true);
  assert.equal(isOwnUserHandle('Suenot', 'suenot'), true);
  assert.equal(isOwnUserHandle('mark', 'suenot'), false);
  assert.equal(isOwnUserHandle('suenot', null), false);
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
  assert.equal(tabFromPath('/u/suenot/sessions'), 'sessions');
  assert.equal(tabFromPath('/u/suenot/projects'), 'projects');
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
