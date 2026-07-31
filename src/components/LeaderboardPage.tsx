import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { publicApi, type LeaderboardMetric } from '../lib/api';
import { PublicShell, PublicState, type PublicAuthProps } from './PublicShell';

const OPTIONS: Array<{ value: LeaderboardMetric; label: string }> = [
  { value: 'tokens', label: 'Tokens' }, { value: 'cost', label: 'Cost' }, { value: 'sessions', label: 'Sessions' },
];

function formatValue(value: number, metric: LeaderboardMetric): string {
  if (metric === 'cost') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return Math.round(value).toLocaleString('en-US');
}

export function LeaderboardPage({ auth }: { auth: PublicAuthProps }) {
  const [metric, setMetric] = useState<LeaderboardMetric>('tokens');
  const { data, loading, error, refetch } = useApi(() => publicApi.getLeaderboard(metric), [metric]);
  useEffect(() => { document.title = 'Users | Harness Analyzer'; }, []);
  return (
    <PublicShell auth={auth}>
      <section className="border-2 border-[var(--line-strong)]">
        <header className="grid gap-5 border-b-2 border-[var(--line-strong)] p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Public community</p><h1 className="mt-3 text-[clamp(3rem,10vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">Users</h1><p className="mt-5 max-w-xl text-sm leading-6 text-[var(--muted)]">A ranking of people who explicitly publish their aggregate usage.</p><p className="mt-3 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Self-reported aggregates · Not provider-verified</p></div>
          <div role="group" aria-label="Leaderboard metric" className="grid grid-cols-3 gap-px border border-[var(--line-strong)] bg-[var(--line-strong)]">
            {OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={metric === option.value} onClick={() => setMetric(option.value)} className="min-h-11 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em]" style={{ background: metric === option.value ? 'var(--ink)' : 'var(--paper)', color: metric === option.value ? 'var(--paper)' : 'var(--ink)' }}>{option.label}</button>)}
          </div>
        </header>
        {loading && !data ? <div className="h-80 animate-pulse bg-[var(--paper-deep)]" aria-label="Loading users" /> : error ? <PublicState eyebrow="Leaderboard / Error" title="Ranking unavailable" body="The public ranking could not be loaded." action={<button type="button" onClick={refetch} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Retry</button>} /> : !data?.users.length ? <PublicState eyebrow="Leaderboard" title="No public profiles yet" body="Published profiles that opt into the ranking will appear here." /> : (
          <ol aria-label={`Leaderboard by ${metric}`}>
            {data.users.map(user => (
              <li key={user.handle} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-b border-[var(--line-strong)] p-4 last:border-0 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <span className="font-mono text-xl font-bold text-[var(--signal)]">#{user.rank}</span>
                <div className="min-w-0"><a href={`/u/${encodeURIComponent(user.handle)}`} className="break-all text-xl font-black tracking-[-0.035em] hover:text-[var(--signal)]">@{user.handle}</a>{user.display_name ? <p className="mt-1 truncate text-xs text-[var(--muted)]">{user.display_name}</p> : null}</div>
                <div className="col-start-2 mt-3 font-mono text-lg font-bold tabular-nums sm:col-start-auto sm:mt-0 sm:text-right"><data value={user.value}>{formatValue(user.value, metric)}</data><p className="mt-1 text-[9px] font-normal uppercase tracking-[0.08em] text-[var(--muted)]">{metric}</p></div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </PublicShell>
  );
}
