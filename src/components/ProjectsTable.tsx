import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { ProjectChart } from './ProjectChart';

export function ProjectsTable() {
  const { data, loading } = useApi(() => api.getProjects(), []);

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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                  {['Project', 'Sessions', 'Sources', 'Cost'].map(h => (
                    <th key={h} className="px-3 py-2 text-xs text-left font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 30).map((p, i) => (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-md" style={{ color: 'var(--text-secondary)' }}>
                      {p.cwd}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {p.sessions}
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
                      ${p.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
