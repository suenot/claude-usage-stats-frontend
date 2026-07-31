import { useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { publicApi, type PublicSnapshotDetails, type UsageBreakdown } from '../lib/api';
import { PublicShell, PublicState, type PublicAuthProps } from './PublicShell';

function compact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return Math.round(value).toLocaleString('en-US');
}

function money(value: number): string {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(value < 10 ? 2 : 0)}`;
}

function Breakdown({ title, values }: { title: string; values: UsageBreakdown }) {
  const rows = Object.entries(values).sort((a, b) => b[1].tokens - a[1].tokens).slice(0, 8);
  const max = Math.max(...rows.map(([, value]) => value.tokens), 1);
  return (
    <section className="border-2 border-[var(--line-strong)] p-4 sm:p-5">
      <h2 className="border-b-2 border-[var(--line-strong)] pb-3 text-2xl font-black uppercase tracking-[-0.055em]">{title}</h2>
      {rows.length === 0 ? <p className="py-12 text-center font-mono text-xs uppercase text-[var(--muted)]">No data</p> : (
        <ol>
          {rows.map(([label, value]) => (
            <li key={label} className="border-b border-[var(--line-soft)] py-3 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <strong className="min-w-0 break-words text-xs uppercase tracking-[0.06em]">{label}</strong>
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">{compact(value.tokens)} tokens</span>
              </div>
              <div className="mt-2 h-2 border border-[var(--line-strong)] bg-[var(--paper-deep)]"><div className="h-full bg-[var(--ink)]" style={{ width: `${Math.max(value.tokens / max * 100, 1)}%` }} /></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DetailAnalytics({ details }: { details: PublicSnapshotDetails }) {
  const history = details.history?.buckets || [];
  const daily = useMemo(() => history.filter(bucket => bucket.timestamp.length <= 10 || bucket.timestamp.endsWith('T00:00')), [history]);
  const dailyMax = Math.max(...daily.map(bucket => Object.values(bucket.values).reduce((sum, value) => sum + value.tokens, 0)), 1);
  const hourlyMax = Math.max(...details.hourly.map(row => row.input_tokens + row.output_tokens + row.cache_read + row.cache_write), 1);
  return (
    <div className="space-y-4 md:space-y-6">
      <section className="border-2 border-[var(--line-strong)] p-4 sm:p-5">
        <h2 className="border-b-2 border-[var(--line-strong)] pb-3 text-2xl font-black uppercase tracking-[-0.055em]">Daily activity</h2>
        <div className="mt-5 flex h-56 items-end gap-1 overflow-hidden" role="img" aria-label="Token volume by day">
          {daily.slice(-60).map(bucket => {
            const value = Object.values(bucket.values).reduce((sum, item) => sum + item.tokens, 0);
            return <div key={bucket.timestamp} className="min-w-1 flex-1 bg-[var(--ink)]" style={{ height: `${Math.max(value / dailyMax * 100, 1)}%` }} title={`${bucket.timestamp}: ${compact(value)} tokens`} />;
          })}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2 md:gap-6"><Breakdown title="By harness" values={details.by_harness} /><Breakdown title="By model" values={details.by_model} /></div>
      <section className="border-2 border-[var(--line-strong)] p-4 sm:p-5">
        <h2 className="border-b-2 border-[var(--line-strong)] pb-3 text-2xl font-black uppercase tracking-[-0.055em]">Hourly activity</h2>
        <div className="mt-5 grid grid-cols-12 gap-1 sm:grid-cols-[repeat(24,minmax(0,1fr))]" role="img" aria-label="Token volume by hour">
          {details.hourly.map(row => {
            const value = row.input_tokens + row.output_tokens + row.cache_read + row.cache_write;
            return (
              <div key={row.hour} className="grid gap-2 text-center">
                <div className="flex h-32 items-end border border-[var(--line-soft)] bg-[var(--paper-deep)]"><div className="w-full bg-[var(--signal)]" style={{ height: `${Math.max(value / hourlyMax * 100, value ? 2 : 0)}%` }} /></div>
                <span className="font-mono text-[9px] text-[var(--muted)]">{row.hour}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function PublicProfilePage({ handle, auth }: { handle: string; auth: PublicAuthProps }) {
  const { data, loading, error, refetch } = useApi(() => publicApi.getUser(handle), [handle]);
  useEffect(() => { document.title = `@${handle} | Harness Analyzer`; }, [handle]);

  if (loading && !data) return <PublicShell auth={auth}><div className="min-h-[70dvh] animate-pulse border-2 border-[var(--line-strong)] bg-[var(--paper-deep)]" aria-label="Loading public profile" /></PublicShell>;
  if (error || !data) {
    const unavailable = error?.includes('404');
    return <PublicShell auth={auth}><PublicState eyebrow="Harness Analyzer / Public profile" title={unavailable ? 'Profile unavailable' : 'Statistics unavailable'} body={unavailable ? 'This profile is private or does not exist.' : 'Public statistics could not be loaded. Try again shortly.'} action={unavailable ? <a href="/users" className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Browse users</a> : <button type="button" onClick={refetch} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Retry</button>} /></PublicShell>;
  }

  const totals = data.snapshot.totals;
  const cards = [
    ['Total cost', money(totals.total_cost)], ['Tokens', compact(totals.total_tokens)], ['Sessions', compact(totals.total_sessions)],
    ['Active days', compact(totals.active_days)], ['This month', money(totals.month_cost)], ['Average day', money(totals.avg_per_active_day)],
  ];
  return (
    <PublicShell auth={auth}>
      <section className="border-x border-t border-[var(--line-strong)] px-4 py-6 sm:px-6 sm:py-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Public usage profile</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="break-all text-[clamp(3rem,10vw,7.5rem)] font-black leading-[0.82] tracking-[-0.065em]">@{data.handle}</h1>{data.display_name ? <p className="mt-4 text-lg text-[var(--muted)]">{data.display_name}</p> : null}</div>
          <span className="border border-[var(--line-strong)] bg-[var(--paper-deep)] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em]">{data.visibility === 'details' ? 'Detailed aggregates' : 'Totals only'}</span>
        </div>
        <p className="mt-5 border-t border-[var(--line-strong)] pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">Self-reported aggregate · Not provider-verified · Snapshot {new Date(data.snapshot.generated_at).toLocaleString()}</p>
      </section>
      <section aria-label="Public totals" className="grid grid-cols-2 gap-px border-2 border-[var(--line-strong)] bg-[var(--line-strong)] sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value]) => <div key={label} className="bg-[var(--paper)] p-4"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p><p className="mt-5 break-words font-mono text-2xl font-bold tracking-[-0.05em]">{value}</p></div>)}
      </section>
      {data.visibility === 'details' && data.snapshot.details ? <div className="mt-4 md:mt-6"><DetailAnalytics details={data.snapshot.details} /></div> : (
        <section className="mt-4 border-2 border-[var(--line-strong)] p-6 text-center md:mt-6"><p className="font-mono text-xs font-bold uppercase tracking-[0.1em]">This user shares totals only</p></section>
      )}
    </PublicShell>
  );
}
