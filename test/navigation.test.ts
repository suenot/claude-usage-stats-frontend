import assert from 'node:assert/strict';
import test from 'node:test';

import { pathForTab, routeKindFromPath, shouldHandleSpaNavigation, tabFromPath } from '../src/lib/navigation.ts';

test('keeps landing and auth callback outside protected app routes', () => {
  assert.equal(routeKindFromPath('/'), 'landing');
  assert.equal(routeKindFromPath('/auth/callback'), 'callback');
  assert.equal(routeKindFromPath('/dashboard'), 'protected');
  assert.equal(routeKindFromPath('/models/'), 'protected');
});

test('maps supported routes and normalizes root and unknown paths to dashboard', () => {
  assert.equal(tabFromPath('/'), 'dashboard');
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
