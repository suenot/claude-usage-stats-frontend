import { Fragment, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatProjectMetric } from '../lib/project-chart';
import { ProjectChart } from './ProjectChart';
import { ProjectDetails } from './ProjectDetails';

export function ProjectsTable() {
  const { data, loading } = useApi(() => api.getProjects(), []);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <ProjectChart data={data} loading={loading} />
      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold p-5 pb-3" style={{ color: 'var(--text-primary)' }}>
            Projects ({data.length})
          </h3>
          <div className="max-h-[40rem] overflow-auto overscroll-contain">
            <table className="w-full min-w-[52rem] border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                  {['Project', 'Sessions', 'Sources', 'Cost', 'Tokens'].map(h => (
                    <th
                      key={h}
                      scope="col"
                      className="sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => {
                  const expanded = expandedRow === i;
                  const detailsId = `project-details-${i}`;
                  return (
                    <Fragment key={`${p.cwd}-${i}`}>
                      <tr className="hover:bg-slate-700/30 transition-colors" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                        <td className="max-w-md px-3 py-2">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={detailsId}
                            onClick={() => setExpandedRow(expanded ? null : i)}
                            className="flex w-full min-w-0 items-center gap-2 text-left font-mono text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <span
                              aria-hidden="true"
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                              style={{ background: 'var(--bg-primary)', color: 'var(--accent-cyan)' }}
                            >
                              {expanded ? '−' : '+'}
                            </span>
                            <span className="truncate" title={p.cwd}>{p.cwd}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.sessions.toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {p.sources.map(s => (
                              <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.1)', color: 'var(--accent-blue)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: 'var(--accent-yellow)' }}>
                          {formatProjectMetric(p.cost, 'usd')}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                          {formatProjectMetric(p.tokens, 'tokens')}
                        </td>
                      </tr>
                      {expanded && (
                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.45)' }}>
                          <td colSpan={5} className="min-w-0 p-0">
                            <ProjectDetails id={detailsId} project={p} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
