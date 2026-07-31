import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicSnapshotV1, SharingSettings } from '../src/lib/api.ts';
import { saveSharingSettings, SharingPublicationError } from '../src/lib/sharing.ts';

const privateSettings: SharingSettings = {
  handle: 'suenot', display_name: 'Suenot', visibility: 'private', leaderboard_opt_in: false, snapshot_generated_at: null,
};
const snapshot: PublicSnapshotV1 = {
  schema_version: 1,
  generated_at: '2026-07-31T12:00:00.000Z',
  totals: {
    total_cost: 1, total_tokens: 2, total_sessions: 3, active_days: 1, active_months: 1,
    today_cost: 1, week_cost: 1, month_cost: 1, avg_per_active_day: 1,
    avg_per_active_month: 1, median_per_active_day: 1, median_per_active_month: 1,
  },
};

test('publishes only after reserving the handle privately and uploading a sanitized snapshot', async () => {
  const calls: string[] = [];
  const desired: SharingSettings = { ...privateSettings, visibility: 'details', leaderboard_opt_in: true };
  const result = await saveSharingSettings(desired, {
    updateSharing: async update => {
      calls.push(`sharing:${update.visibility}:${String(update.leaderboard_opt_in)}`);
      return { ...privateSettings, ...update };
    },
    exportSnapshot: async level => { calls.push(`export:${level}`); return snapshot; },
    publishSnapshot: async value => { calls.push(`snapshot:${value.schema_version}`); },
  });
  assert.deepEqual(calls, ['sharing:private:false', 'export:details', 'snapshot:1', 'sharing:details:true']);
  assert.equal(result.visibility, 'details');
});

test('leaves the profile private when local export fails', async () => {
  const calls: string[] = [];
  await assert.rejects(
    () => saveSharingSettings({ ...privateSettings, visibility: 'totals' }, {
      updateSharing: async update => { calls.push(`sharing:${update.visibility}`); return { ...privateSettings, ...update }; },
      exportSnapshot: async () => { calls.push('export'); throw new Error('disabled'); },
      publishSnapshot: async () => { calls.push('snapshot'); },
    }),
    error => error instanceof SharingPublicationError
      && error.stage === 'export'
      && error.safeSettings?.visibility === 'private',
  );
  assert.deepEqual(calls, ['sharing:private', 'export']);
});

test('private settings never read or upload local telemetry', async () => {
  const calls: string[] = [];
  await saveSharingSettings(privateSettings, {
    updateSharing: async update => { calls.push(`sharing:${update.visibility}`); return privateSettings; },
    exportSnapshot: async () => { calls.push('export'); return snapshot; },
    publishSnapshot: async () => { calls.push('snapshot'); },
  });
  assert.deepEqual(calls, ['sharing:private']);
});

test('refreshes an unchanged public snapshot through the same safe private reservation', async () => {
  const calls: string[] = [];
  const current: SharingSettings = { ...privateSettings, visibility: 'totals', leaderboard_opt_in: true };
  await saveSharingSettings(current, {
    updateSharing: async update => { calls.push(`sharing:${update.visibility}`); return { ...current, ...update }; },
    exportSnapshot: async level => { calls.push(`export:${level}`); return snapshot; },
    publishSnapshot: async () => { calls.push('snapshot'); },
  });
  assert.deepEqual(calls, ['sharing:private', 'export:totals', 'snapshot', 'sharing:totals']);
});
