import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api, type Session } from '../lib/api';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{session.date}</td>
        <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{session.time}</td>
        <td className="px-3 py-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent-blue)' }}>
            {session.source}
          </span>
        </td>
        <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {session.model.replace('claude-', '')}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
          {formatTokens(session.input_tokens)}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
          {formatTokens(session.output_tokens)}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-right font-semibold" style={{ color: 'var(--accent-yellow)' }}>
          ${session.cost.toFixed(2)}
        </td>
        <td className="px-3 py-2 text-xs truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          {session.title || '—'}
        </td>
      </tr>
      {expanded && session.history && (
        <tr>
          <td colSpan={8} className="px-6 py-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {session.history.map((turn, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="font-semibold shrink-0" style={{ color: turn.role === 'user' ? 'var(--accent-cyan)' : 'var(--accent-purple)', width: '32px' }}>
                    {turn.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{turn.text}</span>
                </div>
              ))}
            </div>
            {session.cwd && (
              <div className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                Project: {session.cwd}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function SessionTable() {
  const [limit, setLimit] = useState('50');
  const { data, loading } = useApi(() => api.getSessions({ limit }), [limit]);

  if (loading || !data) return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Recent Sessions ({data.total} total)
        </h3>
        <select
          value={limit}
          onChange={e => setLimit(e.target.value)}
          className="text-sm rounded px-2 py-1 border-0"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              {['Date', 'Time', 'Source', 'Model', 'In', 'Out', 'Cost', 'Title'].map(h => (
                <th key={h} className="px-3 py-2 text-xs text-left font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((s, i) => <SessionRow key={i} session={s} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
