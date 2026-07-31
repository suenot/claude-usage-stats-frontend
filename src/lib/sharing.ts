import type { PublicSnapshotV1, SharingSettings } from './api';

export type PublicationStage = 'reserve' | 'export' | 'snapshot' | 'publish';

export class SharingPublicationError extends Error {
  constructor(
    public readonly stage: PublicationStage,
    public readonly safeSettings: SharingSettings | null,
    public readonly cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : 'Sharing update failed.');
    this.name = 'SharingPublicationError';
  }
}

interface SharingClients {
  updateSharing: (settings: Partial<SharingSettings>) => Promise<SharingSettings>;
  exportSnapshot: (level: 'totals' | 'details') => Promise<PublicSnapshotV1>;
  publishSnapshot: (snapshot: PublicSnapshotV1) => Promise<unknown>;
}

export async function saveSharingSettings(
  desired: SharingSettings,
  clients: SharingClients,
): Promise<SharingSettings> {
  const handle = desired.handle.trim().toLowerCase();
  if (desired.visibility === 'private') {
    return clients.updateSharing({ handle, visibility: 'private', leaderboard_opt_in: false });
  }

  let reserved: SharingSettings;
  try {
    reserved = await clients.updateSharing({ handle, visibility: 'private', leaderboard_opt_in: false });
  } catch (cause) {
    throw new SharingPublicationError('reserve', null, cause);
  }

  let snapshot: PublicSnapshotV1;
  try {
    snapshot = await clients.exportSnapshot(desired.visibility);
  } catch (cause) {
    throw new SharingPublicationError('export', reserved, cause);
  }
  try {
    await clients.publishSnapshot(snapshot);
  } catch (cause) {
    throw new SharingPublicationError('snapshot', reserved, cause);
  }
  try {
    return await clients.updateSharing({
      handle,
      visibility: desired.visibility,
      leaderboard_opt_in: desired.leaderboard_opt_in,
    });
  } catch (cause) {
    throw new SharingPublicationError('publish', reserved, cause);
  }
}
