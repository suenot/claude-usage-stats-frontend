import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api, type Session } from '../lib/api';

const paper = '#F4F4F0';
const ink = '#111111';
const muted = '#66645F';
const line = '#1B1B1B';
const soft = '#DEDDD7';
const red = '#BC1010';

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

export function sessionKey(session: Session, index: number): string {
  return [
    session.sessionId ?? 'no-session-id',
    session.file,
    session.date,
    session.time,
    session.model,
    index,
  ].join(':');
}

function ModelName({ model }: { model: string }) {
  return <span>{model.replace(/^claude-/, '') || 'unknown model'}</span>;
}

function SessionHistory({ session, id }: { session: Session; id: string }) {
  const history = session.history ?? [];

  return (
    <section id={id} aria-label={`Session history for ${session.model}`} className="border-t" style={{ borderColor: line }}>
      <div className="grid gap-px sm:grid-cols-[8.5rem_minmax(0,1fr)]" style={{ background: line }}>
        <div className="p-3 font-mono text-[10px] font-bold tracking-[0.12em]" style={{ background: soft, color: ink }}>
          HISTORY / {history.length.toLocaleString('en-US')}
        </div>
        <div className="max-h-72 space-y-0 overflow-y-auto" style={{ background: paper }}>
          {history.length > 0 ? history.map((turn, index) => (
            <div key={`${turn.role}-${index}`} className="grid grid-cols-[4.75rem_minmax(0,1fr)] border-b p-3 last:border-b-0" style={{ borderColor: soft }}>
              <span className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: turn.role === 'user' ? red : muted }}>
                {turn.role === 'user' ? 'USER' : 'MODEL'}
              </span>
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-5" style={{ color: ink }}>{turn.text}</p>
            </div>
          )) : (
            <p className="p-3 text-sm" style={{ color: muted }}>No message history recorded.</p>
          )}
        </div>
      </div>
      {session.cwd && (
        <div className="grid gap-px border-t sm:grid-cols-[8.5rem_minmax(0,1fr)]" style={{ borderColor: line, background: line }}>
          <span className="p-3 font-mono text-[10px] font-bold tracking-[0.12em]" style={{ background: soft, color: ink }}>PROJECT</span>
          <p className="min-w-0 break-words p-3 font-mono text-xs leading-5 [overflow-wrap:anywhere]" style={{ background: paper, color: muted }}>{session.cwd}</p>
        </div>
      )}
    </section>
  );
}

function SessionCard({ session, historyId, expanded, onToggle }: {
  session: Session;
  historyId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="border-2" style={{ borderColor: line, background: paper }}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? historyId : undefined}
        onClick={onToggle}
        className="block min-h-11 w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
        style={{ outlineColor: red }}
      >
        <div className="flex items-start justify-between gap-3 border-b p-3" style={{ borderColor: line }}>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold tracking-[0.12em]" style={{ color: red }}>{session.date} / {session.time}</p>
            <h3 className="mt-1 break-words text-base font-bold leading-5" style={{ color: ink }}><ModelName model={session.model} /></h3>
          </div>
          <span className="shrink-0 border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em]" style={{ borderColor: line, color: ink }}>
            {expanded ? 'CLOSE' : 'OPEN'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px" style={{ background: line }}>
          <div className="p-3" style={{ background: paper }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: muted }}>HARNESS</p>
            <p className="mt-1 truncate text-sm font-semibold" style={{ color: ink }}>{session.source || 'Unknown'}</p>
          </div>
          <div className="p-3 text-right" style={{ background: paper }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: muted }}>COST</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums" style={{ color: red }}>${session.cost.toFixed(2)}</p>
          </div>
          <div className="p-3" style={{ background: paper }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: muted }}>INPUT</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums" style={{ color: ink }}>{formatTokens(session.input_tokens)}</p>
          </div>
          <div className="p-3 text-right" style={{ background: paper }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.1em]" style={{ color: muted }}>OUTPUT</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums" style={{ color: ink }}>{formatTokens(session.output_tokens)}</p>
          </div>
        </div>

        {session.title && <p className="border-t p-3 text-sm leading-5" style={{ borderColor: line, color: muted }}>{session.title}</p>}
      </button>
      {expanded && <SessionHistory session={session} id={historyId} />}
    </article>
  );
}

function SessionDesktopRow({ session, historyId, expanded, onToggle }: {
  session: Session;
  historyId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b" style={{ borderColor: line, background: expanded ? soft : paper }}>
        <td className="p-3 font-mono text-[11px] tabular-nums" style={{ color: muted }}>{session.date}<br />{session.time}</td>
        <td className="p-3 text-sm font-semibold" style={{ color: ink }}>{session.source || 'Unknown'}</td>
        <td className="p-3 text-sm" style={{ color: ink }}><ModelName model={session.model} /></td>
        <td className="p-3 text-right font-mono text-xs tabular-nums" style={{ color: ink }}>{formatTokens(session.input_tokens)}</td>
        <td className="p-3 text-right font-mono text-xs tabular-nums" style={{ color: ink }}>{formatTokens(session.output_tokens)}</td>
        <td className="p-3 text-right font-mono text-xs font-bold tabular-nums" style={{ color: red }}>${session.cost.toFixed(2)}</td>
        <td className="max-w-64 truncate p-3 text-sm" style={{ color: muted }}>{session.title || 'N/A'}</td>
        <td className="p-2 text-right">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? historyId : undefined}
            onClick={onToggle}
            className="min-h-11 border px-3 font-mono text-[10px] font-bold tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: line, color: ink, outlineColor: red }}
          >
            {expanded ? 'CLOSE' : 'OPEN'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0"><SessionHistory session={session} id={historyId} /></td>
        </tr>
      )}
    </>
  );
}

function SessionLoading() {
  return (
    <div className="border-2 p-4 sm:p-6" aria-label="Loading sessions" aria-busy="true" style={{ borderColor: line, background: paper }}>
      <div className="h-8 w-44 animate-pulse" style={{ background: soft }} />
      <div className="mt-6 space-y-px" style={{ background: line }}>
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse" style={{ background: index % 2 ? paper : soft }} />)}
      </div>
    </div>
  );
}

export function SessionTable() {
  const [limit, setLimit] = useState('50');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useApi(() => api.getSessions({ limit }), [limit]);

  if (loading && !data) return <SessionLoading />;

  if (error && !data) {
    return (
      <section className="border-2 p-5 sm:p-8" style={{ borderColor: line, background: paper }}>
        <p className="font-mono text-[10px] font-bold tracking-[0.12em]" style={{ color: red }}>SESSIONS / ERROR</p>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: ink }}>Session log is unavailable.</h2>
        <button type="button" onClick={refetch} className="mt-6 min-h-11 border-2 px-4 font-mono text-xs font-bold tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: line, color: ink, outlineColor: red }}>RETRY</button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section aria-labelledby="sessions-heading" className="border-2" style={{ borderColor: line, background: paper, color: ink }}>
      <header className="grid gap-px border-b sm:grid-cols-[minmax(0,1fr)_auto]" style={{ borderColor: line, background: line }}>
        <div className="p-4 sm:p-6" style={{ background: paper }}>
          <p className="font-mono text-[10px] font-bold tracking-[0.14em]" style={{ color: red }}>SESSIONS / LOG</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h2 id="sessions-heading" className="text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-5xl">Session archive</h2>
            <p className="font-mono text-xs font-bold tabular-nums" style={{ color: muted }}>{data.total.toLocaleString('en-US')} TOTAL</p>
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-3 p-3 font-mono text-[10px] font-bold tracking-[0.1em] sm:p-4" style={{ background: soft, color: ink }}>
          LIMIT
          <select value={limit} onChange={event => { setLimit(event.target.value); setExpandedId(null); }} className="min-h-11 flex-1 border bg-transparent px-2 font-mono text-sm font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-20 sm:flex-none" style={{ borderColor: line, color: ink, outlineColor: red }}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </label>
      </header>

      <div className="space-y-3 p-3 md:hidden">
        {data.sessions.map((session, index) => {
          const id = sessionKey(session, index);
          return <SessionCard key={id} session={session} historyId={`session-history-mobile-${index}`} expanded={expandedId === id} onToggle={() => setExpandedId(current => current === id ? null : id)} />;
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[52rem] border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: line, background: soft }}>
              {['Date / time', 'Harness', 'Model', 'Input', 'Output', 'Cost', 'Title', 'History'].map(label => <th key={label} scope="col" className="p-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] last:text-right" style={{ color: ink }}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((session, index) => {
              const id = sessionKey(session, index);
              return <SessionDesktopRow key={id} session={session} historyId={`session-history-desktop-${index}`} expanded={expandedId === id} onToggle={() => setExpandedId(current => current === id ? null : id)} />;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
