import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import {
  api,
  type CacheExpiryIncident,
  type DateRange,
} from '../lib/api';
import type { UsageMetric } from '../lib/usage-chart';
import { UsageMetricToggle } from './UsageMetricToggle';

function formatMoney(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(value < 10 ? 2 : 0)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString('en-US');
}

function formatIdle(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function metricValue(incident: CacheExpiryIncident, metric: UsageMetric): number {
  return metric === 'usd' ? incident.estimated_cost : incident.estimated_tokens;
}

function CacheExpiryLoading() {
  return (
    <section
      aria-label="Loading cache expiry estimate"
      aria-busy="true"
      className="min-h-96 animate-pulse border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5"
    >
      <div className="h-7 w-52 bg-[#DEDDD7]" />
      <div className="mt-5 h-16 w-44 bg-[#DEDDD7]" />
      <div className="mt-6 grid grid-cols-2 gap-px bg-[#111111] sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-20 bg-[#DEDDD7]" />)}
      </div>
    </section>
  );
}

export function CacheExpiryChart({ range }: { range?: DateRange }) {
  const { data, loading, error, refetch } = useApi(
    () => api.getCacheExpiry(range),
    [range?.from, range?.to],
  );
  const [metric, setMetric] = useState<UsageMetric>('usd');

  const topIncidents = useMemo(() => data?.top_incidents.slice(0, 5) || [], [data]);
  const maxIncidentValue = useMemo(
    () => Math.max(...topIncidents.map(incident => metricValue(incident, metric)), 0),
    [topIncidents, metric],
  );

  if (loading && !data) return <CacheExpiryLoading />;

  if (error && !data) {
    return (
      <section className="min-h-96 border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#BC1010]">Cache continuity / error</p>
        <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Cache expiry estimate</h3>
        <p className="mt-4 max-w-prose text-sm leading-6 text-[#66645F]">Cache expiry data is unavailable.</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-6 min-h-11 border-2 border-[#111111] bg-[#F4F4F0] px-4 font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-[#F4F4F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC1010]"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!data) return <CacheExpiryLoading />;

  const coverageTotal = data.coverage.eligible_sessions + data.coverage.excluded_sessions;
  const coveragePct = coverageTotal > 0
    ? (data.coverage.eligible_sessions / coverageTotal) * 100
    : 0;
  const insufficientCoverage = data.coverage.eligible_sessions === 0 && data.coverage.excluded_sessions > 0;
  const empty = data.incidents === 0;
  const totalValue = metric === 'usd' ? data.estimated_lost_cost : data.estimated_expired_tokens;
  const formatMetric = metric === 'usd' ? formatMoney : formatTokens;

  return (
    <section className="min-w-0 border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <header className="grid gap-4 border-b-2 border-[#111111] pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#BC1010]">Cache continuity</p>
            <span className="border border-[#111111] bg-[#DEDDD7] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#111111]">
              Heuristic / 5m + 1h
            </span>
          </div>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Cache expiry estimate</h3>
          <p className="mt-2 max-w-prose text-xs leading-5 text-[#66645F]">Estimated overhead after inactivity. Not a provider invoice.</p>
        </div>
        <UsageMetricToggle label="Cache expiry metric" metric={metric} onChange={setMetric} />
      </header>

      {error && data ? (
        <div role="status" className="mt-4 border border-[#BC1010] bg-[#F4E7E2] px-3 py-2 font-mono text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-[#BC1010]">
          Refresh failed. Showing the last successful range.{' '}
          <button type="button" onClick={refetch} className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC1010]">
            Retry
          </button>
        </div>
      ) : null}

      {insufficientCoverage ? (
        <div className="grid min-h-64 place-items-center py-8 text-center">
          <div className="max-w-md">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#111111]">Not enough cache expiry telemetry</p>
            <p className="mt-3 text-sm leading-6 text-[#66645F]">
              {data.coverage.excluded_sessions.toLocaleString('en-US')} sessions in this range do not expose explicit 5m/1h cache-write counters.
            </p>
          </div>
        </div>
      ) : empty ? (
        <div className="grid min-h-64 place-items-center py-8 text-center">
          <div className="max-w-md">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#111111]">No likely cache expirations in this range</p>
            <p className="mt-3 text-sm leading-6 text-[#66645F]">
              {data.coverage.analyzed_events.toLocaleString('en-US')} events analyzed across {data.coverage.eligible_sessions.toLocaleString('en-US')} eligible sessions.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 border-l-4 border-[#BC1010] pl-3">
            <data value={String(totalValue)} className="block break-words font-mono text-3xl font-bold tabular-nums text-[#111111]">
              {formatMetric(totalValue)}{metric === 'tokens' ? ' tokens' : ''}
            </data>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#66645F]">
              {metric === 'usd' ? 'Estimated overhead' : 'Estimated expired input'}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-px border border-[#111111] bg-[#111111] sm:grid-cols-3">
            {[
              { label: 'Incidents', value: data.incidents.toLocaleString('en-US') },
              { label: 'Idle time', value: formatIdle(data.total_idle_minutes) },
              { label: 'Observed TTL sessions', value: `${coveragePct.toFixed(0)}%` },
            ].map(stat => (
              <div key={stat.label} className="min-w-0 bg-[#F4F4F0] px-3 py-3">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#66645F]">{stat.label}</dt>
                <dd className="mt-2 break-words font-mono text-sm font-bold tabular-nums text-[#111111]">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <ol aria-label="Largest estimated cache expiry incidents" className="mt-5 border-t border-[#111111]">
            {topIncidents.map((incident, index) => {
              const value = metricValue(incident, metric);
              const width = maxIncidentValue > 0 ? Math.max((value / maxIncidentValue) * 100, 1) : 0;
              const identity = [incident.source, incident.model].filter(Boolean).join(' / ') || 'Unknown source / model';
              const context = incident.project || incident.title || incident.session_id || 'Session details unavailable';

              return (
                <li key={`${incident.timestamp}-${incident.session_id || index}-${incident.ttl}`} className="min-w-0 border-b border-[#DEDDD7] py-3">
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em]">
                        <time className="text-[#66645F]" dateTime={incident.timestamp}>{formatTimestamp(incident.timestamp)}</time>
                        <span className="text-[#BC1010]">{formatIdle(incident.idle_minutes)} gap</span>
                        <span className="border border-[#111111] px-1.5 py-0.5 text-[#111111]">{incident.ttl}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-bold leading-5 text-[#111111] [overflow-wrap:anywhere]">{identity}</p>
                      <p className="mt-1 break-words font-mono text-[10px] leading-4 text-[#66645F] [overflow-wrap:anywhere]">{context}</p>
                    </div>
                    <div className="text-left font-mono text-xs tabular-nums text-[#111111] sm:text-right">
                      <strong className="block font-bold">{formatMetric(value)}{metric === 'tokens' ? ' tokens' : ''}</strong>
                      <span className="mt-1 block text-[10px] text-[#66645F]">estimated</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full border border-[#111111] bg-[#DEDDD7]" aria-hidden="true">
                    <div className="h-full bg-[#BC1010]" style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <footer className="mt-5 border-t border-[#DEDDD7] pt-3 font-mono text-[9px] uppercase leading-4 tracking-[0.08em] text-[#66645F]">
        {data.methodology} · {data.coverage.analyzed_events.toLocaleString('en-US')} events analyzed
        {data.coverage.sources.length > 0 ? ` · ${data.coverage.sources.join(', ')}` : ''}
        {data.coverage.excluded_sessions > 0 ? ` · ${data.coverage.excluded_sessions.toLocaleString('en-US')} sessions excluded` : ''}
      </footer>
    </section>
  );
}
