import { useEffect, useState, type MouseEvent } from 'react';
import { useApi } from './hooks/useApi';
import { api, type DateRange } from './lib/api';
import { StatCards } from './components/StatCards';
import { DailyChart } from './components/DailyChart';
import { PieSection } from './components/PieSection';
import { Heatmap } from './components/Heatmap';
import { SessionTable } from './components/SessionTable';
import { ProjectsTable } from './components/ProjectsTable';
import { ModelPricingTable } from './components/ModelPricingTable';
import { pathForTab, shouldHandleSpaNavigation, tabFromPath, tabs, type Tab } from './lib/navigation';

export default function App() {
  const [tab, setTab] = useState<Tab>(() => (
    typeof window === 'undefined' ? 'dashboard' : tabFromPath(window.location.pathname)
  ));
  const { data: summary, loading, refetch } = useApi(() => api.getSummary(), []);
  const [refreshing, setRefreshing] = useState(false);
  // Shared date range — selected on the daily chart, consumed by pies + hourly.
  const [range, setRange] = useState<DateRange>({});

  useEffect(() => {
    const syncLocation = () => {
      const nextTab = tabFromPath(window.location.pathname);
      const canonicalPath = pathForTab(nextTab);
      if (window.location.pathname !== canonicalPath) {
        window.history.replaceState(null, '', canonicalPath);
      }
      setTab(nextTab);
    };

    syncLocation();
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.collectData();
      refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const navigate = (event: MouseEvent<HTMLAnchorElement>, nextTab: Tab) => {
    if (!shouldHandleSpaNavigation(event)) return;
    event.preventDefault();
    const nextPath = pathForTab(nextTab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setTab(nextTab);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
        <div className="max-w-7xl mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Claude Usage Stats</h1>
          </div>
          <div className="flex min-w-0 items-center gap-3 sm:flex-none">
            <nav aria-label="Primary navigation" className="min-w-0 flex-1 overflow-x-auto rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex w-max gap-0.5 p-0.5 sm:gap-1 sm:p-1">
              {tabs.map(t => (
                <a
                  key={t}
                  href={pathForTab(t)}
                  onClick={event => navigate(event, t)}
                  aria-current={tab === t ? 'page' : undefined}
                  className="shrink-0 rounded-md px-2 py-1 text-xs capitalize transition-colors sm:px-3 sm:py-1.5 sm:text-sm"
                  style={{
                    background: tab === t ? 'var(--bg-primary)' : 'transparent',
                    color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {t}
                </a>
              ))}
              </div>
            </nav>
            {tab !== 'models' && <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)' }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {tab === 'models' ? (
          <ModelPricingTable />
        ) : loading || !summary ? (
          <div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>Loading data...</div>
        ) : (
          <>
            <StatCards summary={summary} />

            {tab === 'dashboard' && (
              <>
                <DailyChart range={range} onRangeChange={setRange} />
                <PieSection range={range} setRange={setRange} />
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
