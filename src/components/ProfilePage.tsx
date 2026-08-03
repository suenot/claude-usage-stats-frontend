import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api, ApiError, publicApi, type SharingSettings, type SharingVisibility } from '../lib/api';
import { isValidPublicHandle } from '../lib/navigation';
import { saveSharingSettings, SharingPublicationError, type PublicationStage } from '../lib/sharing';
import { useHarnessAuth } from './AuthGate';

const OPTIONS: Array<{ value: SharingVisibility; title: string; body: string }> = [
  { value: 'private', title: 'Private', body: 'Nothing is available on your public profile. This is the default.' },
  { value: 'totals', title: 'Totals only', body: 'Share total cost, tokens, sessions and activity counts.' },
  { value: 'details', title: 'Totals + details', body: 'Also share aggregate daily, model, harness and hourly charts.' },
];

function exporterMessage(error: unknown, stage: PublicationStage): string {
  if (error instanceof ApiError && stage === 'reserve') return error.message || 'This public handle is unavailable.';
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return 'The local snapshot exporter is unavailable. Open Harness Analyzer on the computer that contains your telemetry and enable snapshot export, then try again. Your profile remains private.';
  }
  return `${error instanceof Error && error.message ? error.message : 'Your public snapshot could not be updated.'} Your profile remains private.`;
}

export function ProfilePage() {
  const { session, logout, updateOwnHandle } = useHarnessAuth();
  const { data, loading, error, refetch } = useApi(() => publicApi.getSharing(), []);
  const [form, setForm] = useState<SharingSettings | null>(null);
  const [persisted, setPersisted] = useState<SharingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => { document.title = 'Profile | Harness Analyzer'; }, []);
  useEffect(() => { if (data) { setForm(data); setPersisted(data); } }, [data]);

  const normalizedHandle = form?.handle.trim().toLowerCase() || '';
  const handleValid = isValidPublicHandle(normalizedHandle);
  const dirty = useMemo(() => !!form && !!persisted && (
    normalizedHandle !== persisted.handle
    || form.visibility !== persisted.visibility
    || form.leaderboard_opt_in !== persisted.leaderboard_opt_in
  ), [form, persisted, normalizedHandle]);
  const canSave = handleValid && !!form && (dirty || form.visibility !== 'private');

  const save = async () => {
    if (!form || !handleValid || (form.visibility === 'private' && !dirty)) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const next = await saveSharingSettings({ ...form, handle: normalizedHandle }, {
        updateSharing: publicApi.updateSharing,
        exportSnapshot: api.exportPublicSnapshot,
        publishSnapshot: publicApi.publishSnapshot,
      });
      setForm(next);
      setPersisted(next);
      updateOwnHandle(next.handle);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof SharingPublicationError && cause.safeSettings) {
        setForm(cause.safeSettings);
        setPersisted(cause.safeSettings);
        updateOwnHandle(cause.safeSettings.handle);
      }
      setSaveError(form.visibility === 'private'
        ? (cause instanceof Error && cause.message ? cause.message : 'Sharing settings could not be saved.')
        : exporterMessage(cause instanceof SharingPublicationError ? cause.cause : cause, cause instanceof SharingPublicationError ? cause.stage : 'reserve'));
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = async () => {
    if (!persisted || persisted.visibility === 'private') return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${persisted.handle}`);
      setCopyStatus('Public link copied.');
    } catch {
      setCopyStatus('Copy failed. Open the profile and copy its address.');
    }
  };

  const createSyncToken = async () => {
    setSyncBusy(true);
    setSyncStatus(null);
    try {
      const result = await publicApi.createSyncToken();
      setSyncToken(result.token);
      setSyncStatus('New token created. Any previous CLI token is now invalid.');
    } catch (cause) {
      setSyncStatus(cause instanceof Error ? cause.message : 'Token creation failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  const copySyncToken = async () => {
    if (!syncToken) return;
    try {
      await navigator.clipboard.writeText(syncToken);
      setSyncStatus('Token copied. Run "harness-analyzer login" and paste it.');
    } catch {
      setSyncStatus('Copy failed. Select the token and copy it manually.');
    }
  };

  const revokeSyncToken = async () => {
    setSyncBusy(true);
    setSyncStatus(null);
    try {
      await publicApi.revokeSyncToken();
      setSyncToken(null);
      setSyncStatus('CLI access revoked.');
    } catch (cause) {
      setSyncStatus(cause instanceof Error ? cause.message : 'Token revocation failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  if (loading && !form) return <div className="min-h-96 animate-pulse border-2 border-[var(--line-strong)] bg-[var(--paper-deep)]" aria-label="Loading profile settings" />;
  if (error || !form) return <section className="grid min-h-96 place-items-center border-2 border-[var(--line-strong)] p-5 text-center"><div><p className="font-mono text-xs font-bold uppercase text-[var(--signal)]">Profile unavailable</p><button type="button" onClick={refetch} className="mt-5 min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Retry</button></div></section>;

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="border-2 border-[var(--line-strong)]">
        <header className="border-b-2 border-[var(--line-strong)] p-4 sm:p-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Harness Analyzer / Account</p>
          <h2 className="mt-3 text-[clamp(3rem,10vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">Profile</h2>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">{session.email}</p>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <section className="border-b-2 border-[var(--line-strong)] p-4 sm:p-6 lg:border-b-0 lg:border-r-2">
            <label htmlFor="public-handle" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Public handle</label>
            <div className="mt-3 flex border-2 border-[var(--line-strong)] bg-[var(--paper)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--signal)]"><span className="grid w-11 shrink-0 place-items-center border-r border-[var(--line-strong)] font-mono font-bold">@</span><input id="public-handle" value={form.handle} onChange={event => { setSaved(false); setForm({ ...form, handle: event.target.value.toLowerCase() }); }} maxLength={40} autoCapitalize="none" autoCorrect="off" className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-sm outline-none" /></div>
            {!handleValid ? <p className="mt-2 text-xs leading-5 text-[var(--signal)]">Use 2-40 lowercase letters or numbers. Hyphens can separate words.</p> : <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Your public page: /u/{normalizedHandle}</p>}
            {persisted && persisted.visibility !== 'private' ? <div className="mt-5 flex flex-wrap gap-2"><a href={`/u/${encodeURIComponent(persisted.handle)}`} className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)]">View public profile</a><button type="button" onClick={copyPublicLink} className="min-h-11 border-2 border-[var(--line-strong)] bg-[var(--paper-deep)] px-4 font-mono text-xs font-bold uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)]">Copy link</button><span aria-live="polite" className="w-full text-xs text-[var(--muted)]">{copyStatus}</span></div> : null}
          </section>

          <fieldset className="min-w-0 p-4 sm:p-6">
            <legend className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Sharing</legend>
            <div className="mt-3 grid gap-px border-2 border-[var(--line-strong)] bg-[var(--line-strong)]">
              {OPTIONS.map(option => (
                <label key={option.value} className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 bg-[var(--paper)] p-4 hover:bg-[var(--paper-soft)]">
                  <input type="radio" name="sharing" value={option.value} checked={form.visibility === option.value} onChange={() => { setSaved(false); setForm({ ...form, visibility: option.value, leaderboard_opt_in: option.value === 'private' ? false : form.leaderboard_opt_in }); }} className="mt-1 h-4 w-4 accent-[var(--signal)]" />
                  <span><strong className="block text-sm font-black uppercase tracking-[0.04em]">{option.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{option.body}</span></span>
                </label>
              ))}
            </div>
            {form.visibility !== 'private' ? (
              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 border border-[var(--line-strong)] p-3"><input type="checkbox" checked={form.leaderboard_opt_in} onChange={event => { setSaved(false); setForm({ ...form, leaderboard_opt_in: event.target.checked }); }} className="mt-0.5 h-4 w-4 accent-[var(--signal)]" /><span><strong className="block text-xs uppercase tracking-[0.06em]">Include me in Users ranking</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Your public link works either way. This separate option adds your handle and ranking value to Users.</span></span></label>
            ) : null}
            <p className="mt-4 border-l-4 border-[var(--signal)] pl-3 text-xs leading-5 text-[var(--muted)]">Public snapshots contain aggregates only. Sessions, prompts, project paths, files and cache incident identities are never included.</p>
          </fieldset>
        </div>

        <footer className="flex flex-col gap-3 border-t-2 border-[var(--line-strong)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div aria-live="polite" className="min-h-5 text-xs leading-5">{saveError ? <span className="text-[var(--signal)]">{saveError}</span> : saved ? <span>Sharing settings saved.</span> : form.snapshot_generated_at ? <span className="text-[var(--muted)]">Last snapshot {new Date(form.snapshot_generated_at).toLocaleString()}</span> : null}</div>
          <button type="button" onClick={save} disabled={!canSave || saving} className="min-h-12 bg-[var(--signal)] px-6 font-mono text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Publishing' : form.visibility === 'private' ? 'Save privacy' : persisted?.visibility === 'private' ? 'Publish snapshot' : 'Update snapshot'}</button>
        </footer>
      </section>
      <section className="border-2 border-[var(--line-strong)] p-4 sm:p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">CLI sync</p>
        <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">Update from this Mac</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">The hosted site cannot read local Claude or Codex files. Install the CLI, connect it once, then run <code className="font-mono font-bold text-[var(--ink)]">harness-analyzer sync</code>. Only aggregate statistics are uploaded.</p>
        <div className="mt-4 border border-[var(--line-strong)] bg-[var(--paper-deep)] p-3 font-mono text-xs leading-6"><div>npm install -g harness-analyzer</div><div>harness-analyzer login</div><div>harness-analyzer sync</div></div>
        {syncToken ? <div className="mt-4"><label htmlFor="sync-token" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Shown once</label><input id="sync-token" readOnly value={syncToken} className="mt-2 min-h-11 w-full border-2 border-[var(--line-strong)] bg-[var(--paper)] px-3 font-mono text-xs" /></div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={createSyncToken} disabled={syncBusy} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white disabled:opacity-50">{syncToken ? 'Replace token' : 'Create token'}</button>
          {syncToken ? <button type="button" onClick={copySyncToken} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Copy token</button> : null}
          <button type="button" onClick={revokeSyncToken} disabled={syncBusy} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase disabled:opacity-50">Revoke CLI access</button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-[var(--muted)]">{syncStatus}</p>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--line-strong)] p-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Account</p><p className="mt-1 text-sm">Signed in as {session.email}</p></div><button type="button" onClick={logout} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)]">Sign out</button></section>
    </div>
  );
}
