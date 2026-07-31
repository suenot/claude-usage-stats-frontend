import { useEffect, useState, type MouseEvent } from 'react';
import { useApi } from './hooks/useApi';
import { api, type Summary } from './lib/api';
import { SessionTable } from './components/SessionTable';
import { ProjectsTable } from './components/ProjectsTable';
import { ModelPricingTable } from './components/ModelPricingTable';
import { ProfilePage } from './components/ProfilePage';
import { useHarnessAuth } from './components/AuthGate';
import { parseRoute, pathForPublicProfile, pathForTab, shouldHandleSpaNavigation, type Tab } from './lib/navigation';
import { SiteHeader } from './components/SiteHeader';
import { UsageDashboard } from './components/UsageDashboard';

const tabLabels: Record<Tab, string> = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  projects: 'Projects',
  models: 'Models',
};

export default function App() {
  const { session: authSession, ownHandle } = useHarnessAuth();
  const [pathname, setPathname] = useState(() => typeof window === 'undefined' ? '/dashboard' : window.location.pathname);
  const route = parseRoute(pathname);
  const tab: Tab = route.kind === 'app' ? route.tab : 'dashboard';
  const needsSummary = (route.kind === 'app' && tab === 'dashboard') || route.kind === 'public-profile';
  const { data: summary, loading, error: summaryError, refetch } = useApi<Summary | null>(
    () => needsSummary ? api.getSummary() : Promise.resolve(null),
    [needsSummary],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    const syncLocation = () => {
      setPathname(window.location.pathname);
    };

    syncLocation();
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, []);

  useEffect(() => {
    document.title = `${route.kind === 'profile' ? 'Profile' : tabLabels[tab]} | Harness Analyzer`;
  }, [route.kind, tab]);

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
    const nextPath = nextTab === 'dashboard' && ownHandle ? pathForPublicProfile(ownHandle) : pathForTab(nextTab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setPathname(nextPath);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader
        session={authSession}
        activeTab={route.kind === 'public-profile' ? 'dashboard' : tab}
        dashboardPath={ownHandle ? pathForPublicProfile(ownHandle) : '/dashboard'}
        profileActive={route.kind === 'profile'}
        onNavigateTab={navigate}
        onRefresh={(route.kind === 'public-profile' || (route.kind === 'app' && tab !== 'models')) ? handleRefresh : undefined}
        refreshing={refreshing}
      />

      <main className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6 lg:pb-8">
        {route.kind === 'profile' ? (
          <ProfilePage />
        ) : tab === 'models' ? (
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
          <UsageDashboard key={dataRevision} summary={summary} />
        )}
      </main>

      <footer className="mx-auto hidden max-w-[1440px] border-x border-t border-[var(--line-strong)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] lg:flex lg:items-center lg:justify-between">
        <span>Harness Analyzer</span>
        <span>Made by marketmaker.cc</span>
      </footer>
    </div>
  );
}
