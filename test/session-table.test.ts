import assert from 'node:assert/strict';
import test from 'node:test';

import { sessionKey } from '../src/components/SessionTable.tsx';
import type { Session } from '../src/lib/api.ts';

const session: Session = {
  date: '2026-07-30',
  time: '10:00',
  source: 'codex',
  file: '/tmp/session.jsonl',
  cost: 1,
  input_tokens: 10,
  output_tokens: 20,
  cache_read: 0,
  cache_write: 0,
  model: 'gpt-5',
  sessionId: 'reused-session-id',
};

test('builds unique row keys when the API reuses a session ID', () => {
  assert.notEqual(sessionKey(session, 0), sessionKey(session, 1));
  assert.match(sessionKey(session, 0), /^reused-session-id:/);
});
