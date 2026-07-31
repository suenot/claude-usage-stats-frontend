import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SiteHeader } from '../src/components/SiteHeader.tsx';

test('uses user-scoped navigation and a single email profile link', () => {
  const html = renderToStaticMarkup(createElement(SiteHeader, {
    session: {
      token: 'token',
      user_id: 'user-1',
      email: 'suenot@gmail.com',
      username: 'suenot',
      services: { 'harness-analyzer': 'admin' },
    },
    userHandle: 'suenot',
    activeTab: 'sessions',
  }));

  assert.match(html, /href="\/u\/suenot"/);
  assert.match(html, /href="\/u\/suenot\/sessions"/);
  assert.match(html, /href="\/u\/suenot\/projects"/);
  assert.doesNotMatch(html, />Models</);
  assert.equal(html.match(/href="\/profile"/g)?.length, 1);
  assert.match(html, />suenot@gmail\.com<\/a>/);
  assert.doesNotMatch(html, />Profile<\/a>/);
});
