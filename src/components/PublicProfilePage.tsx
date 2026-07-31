import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { publicApi, type PublicSnapshotTotals, type Summary } from '../lib/api';
import { PublicShell, PublicState, type PublicAuthProps } from './PublicShell';
import { UsageDashboard } from './UsageDashboard';

export function publicTotalsToSummary(totals: PublicSnapshotTotals, generatedAt: string): Summary {
  return {
    generated_at: generatedAt,
    today: generatedAt.slice(0, 10),
    current_month: generatedAt.slice(0, 7),
    totals: { grand_total: totals.total_cost },
    today_cost: totals.today_cost,
    week_cost: totals.week_cost,
    month_cost: totals.month_cost,
    active_days: totals.active_days,
    active_months: totals.active_months,
    avg_per_active_day: totals.avg_per_active_day,
    avg_per_active_month: totals.avg_per_active_month,
    median_per_active_day: totals.median_per_active_day,
    median_per_active_month: totals.median_per_active_month,
    session_counts: { total: totals.total_sessions },
  };
}

export function PublicProfilePage({ handle, auth }: { handle: string; auth: PublicAuthProps }) {
  const { data, loading, error, refetch } = useApi(() => publicApi.getUser(handle), [handle]);
  useEffect(() => { document.title = `@${handle} | Harness Analyzer`; }, [handle]);

  if (loading && !data) return <PublicShell auth={auth}><div className="min-h-[70dvh] animate-pulse border-2 border-[var(--line-strong)] bg-[var(--paper-deep)]" aria-label="Loading public profile" /></PublicShell>;
  if (error || !data) {
    const unavailable = error?.includes('404');
    return <PublicShell auth={auth}><PublicState eyebrow="Harness Analyzer / Public profile" title={unavailable ? 'Profile unavailable' : 'Statistics unavailable'} body={unavailable ? 'This profile is private or does not exist.' : 'Public statistics could not be loaded. Try again shortly.'} action={unavailable ? <a href="/users" className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Browse users</a> : <button type="button" onClick={refetch} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Retry</button>} /></PublicShell>;
  }

  const summary = publicTotalsToSummary(data.snapshot.totals, data.snapshot.generated_at);
  return (
    <PublicShell auth={auth}>
      <UsageDashboard
        summary={summary}
        details={data.visibility === 'details' ? data.snapshot.details : undefined}
        ownerHandle={data.handle}
        visibility={data.visibility}
      />
    </PublicShell>
  );
}
