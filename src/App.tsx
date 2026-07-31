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
import { useHarnessAuth } from './components/AuthGate';
import { pathForTab, shouldHandleSpaNavigation, tabFromPath, tabs, type Tab } from './lib/navigation';

const tabLabels: Record<Tab, string> = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  projects: 'Projects',
  models: 'Models',
};

export default function App() {
  const { session: authSession, logout } = useHarnessAuth();
  const [tab, setTab] = useState<Tab>(() => (
    typeof window === 'undefined' ? 'dashboard' : tabFromPath(window.location.pathname)
  ));
  const { data: summary, loading, error: summaryError, refetch } = useApi(() => api.getSummary(), []);
  const [refreshing, setRefreshing] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  // Shared date range selected on the history chart and consumed by every
  // downstream usage breakdown.
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

  useEffect(() => {
    document.title = `${tabLabels[tab]} | Harness Analyzer`;
  }, [tab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.collectData();
      refetch();
      setDataRevision(revision => revision + 1);
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
    <div className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <header className="app-header">
        <div className="mx-auto grid min-h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-stretch lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center border-r border-[var(--line-strong)] px-3 md:px-5">
            <img
              src="/harness-analyzer-logo.png"
              alt=""
              aria-hidden="true"
              className="h-11 w-11 shrink-0 object-contain mix-blend-multiply"
            />
            <div className="ml-3 min-w-0">
              <h1 className="truncate text-base font-black uppercase leading-none tracking-[-0.035em] md:text-lg">
                Harness Analyzer
              </h1>
              <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">
                Local usage telemetry
              </p>
            </div>
          </div>

          <nav aria-label="Primary navigation" className="app-nav">
            <div className="grid h-full grid-cols-4 md:flex md:justify-end">
              {tabs.map(t => (
                <a
                  key={t}
                  href={pathForTab(t)}
                  onClick={event => navigate(event, t)}
                  aria-current={tab === t ? 'page' : undefined}
                  className="app-nav-link"
                >
                  {tabLabels[t]}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex items-stretch">
            <span className="hidden max-w-48 items-center truncate border-r border-[var(--line-strong)] px-4 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--muted)] xl:flex" title={authSession.email}>
              {authSession.email}
            </span>
            {tab !== 'models' && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="min-h-11 min-w-24 border-0 bg-[var(--signal)] px-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white transition-[background-color,transform] hover:bg-[var(--ink)] active:translate-y-px disabled:cursor-wait disabled:opacity-60 md:min-w-32 md:px-5"
              >
                {refreshing ? 'Collecting' : 'Refresh data'}
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="min-h-11 border-0 border-l border-[var(--line-strong)] bg-[var(--paper)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)] hover:bg-[var(--ink)] hover:text-[var(--paper)] md:px-4"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6 lg:pb-8">
        {tab === 'models' ? (
          <ModelPricingTable />
        ) : tab === 'projects' ? (
          <ProjectsTable refreshKey={dataRevision} />
        ) : tab === 'sessions' ? (
          <SessionTable key={dataRevision} />
        ) : summaryError ? (
          <div className="grid min-h-72 place-items-center border border-[var(--line-strong)] px-5 text-center">
            <div className="max-w-lg">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[var(--signal)]">Local service unavailable</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Start Harness Analyzer on this computer, then retry. Your telemetry stays local and is never uploaded to Vercel.
              </p>
              <button type="button" onClick={refetch} className="mt-5 min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[var(--ink)]">
                Retry
              </button>
            </div>
          </div>
        ) : loading || !summary ? (
          <div className="grid min-h-72 place-items-center border border-[var(--line-strong)] font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
            Loading telemetry
          </div>
        ) : (
          <div key={dataRevision} className="space-y-4 md:space-y-6">
            <section className="border-x border-t border-[var(--line-strong)] px-3 py-4 md:px-5 md:py-5">
              <h2 className="text-[clamp(2.75rem,9vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">
                Usage
              </h2>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line-strong)] pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
                <span>Cost, tokens and cache behavior</span>
                <span>{summary.generated_at}</span>
              </div>
            </section>
            <StatCards summary={summary} />
            <div className="space-y-4 md:space-y-6">
                <DailyChart range={range} onRangeChange={setRange} />
                <PieSection range={range} setRange={setRange} />
                <Heatmap range={range} />
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto hidden max-w-[1440px] border-x border-t border-[var(--line-strong)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] lg:flex lg:items-center lg:justify-between">
        <span>Harness Analyzer</span>
        <span>Made by marketmaker.cc</span>
      </footer>
    </div>
  );
}
