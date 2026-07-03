import { useState } from 'react';
import { useApi } from './hooks/useApi';
import { api } from './lib/api';
import { StatCards } from './components/StatCards';
import { DailyChart } from './components/DailyChart';
import { PieSection } from './components/PieSection';
import { Heatmap } from './components/Heatmap';
import { SessionTable } from './components/SessionTable';
import { ProjectsTable } from './components/ProjectsTable';

type Tab = 'dashboard' | 'sessions' | 'projects';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { data: summary, loading, refetch } = useApi(() => api.getSummary(), []);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.collectData();
      refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Claude Usage Stats</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              {(['dashboard', 'sessions', 'projects'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-3 py-1.5 text-sm rounded-md transition-colors capitalize"
                  style={{
                    background: tab === t ? 'var(--bg-primary)' : 'transparent',
                    color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {t}
                </button>
              ))}
            </nav>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)' }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {loading || !summary ? (
          <div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>Loading data...</div>
        ) : (
          <>
            <StatCards summary={summary} />

            {tab === 'dashboard' && (
              <>
                <DailyChart />
                <PieSection />
                <Heatmap />
              </>
            )}

            {tab === 'sessions' && <SessionTable />}

            {tab === 'projects' && <ProjectsTable />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {summary && `Generated: ${summary.generated_at}`}
      </footer>
    </div>
  );
}
