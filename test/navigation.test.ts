import assert from 'node:assert/strict';
import test from 'node:test';

import { pathForTab, shouldHandleSpaNavigation, tabFromPath } from '../src/lib/navigation.ts';

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
