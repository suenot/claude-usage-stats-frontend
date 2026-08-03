import { useEffect, useState, type MouseEvent } from 'react';
import { useApi } from './hooks/useApi';
import { api, type Summary } from './lib/api';
import { SessionTable } from './components/SessionTable';
import { ProjectsTable } from './components/ProjectsTable';
import { ModelPricingTable } from './components/ModelPricingTable';
import { ProfilePage } from './components/ProfilePage';
import { useHarnessAuth } from './components/AuthGate';
import { parseRoute, pathForTab, pathForUserTab, shouldHandleSpaNavigation, type Tab, type UserTab } from './lib/navigation';
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
  const tab: Tab = route.kind === 'app' || route.kind === 'public-profile' ? route.tab : 'dashboard';
  const needsSummary = tab === 'dashboard' && (route.kind === 'app' || route.kind === 'public-profile');
  const { data: summary, loading, error: summaryError, refetch } = useApi<Summary | null>(
    () => needsSummary ? api.getSummary() : Promise.resolve(null),
    [needsSummary],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  const isLocal = typeof window === 'undefined' || ['localhost', '127.0.0.1'].includes(window.location.hostname);

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

  const navigate = (event: MouseEvent<HTMLAnchorElement>, nextTab: UserTab) => {
    if (!shouldHandleSpaNavigation(event)) return;
    event.preventDefault();
    const nextPath = ownHandle ? pathForUserTab(ownHandle, nextTab) : pathForTab(nextTab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setPathname(nextPath);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader
        session={authSession}
        activeTab={tab === 'models' ? undefined : tab}
        userHandle={ownHandle}
        profileActive={route.kind === 'profile'}
        onNavigateTab={navigate}
        onRefresh={isLocal && (route.kind === 'public-profile' || (route.kind === 'app' && tab !== 'models')) ? handleRefresh : undefined}
        refreshing={refreshing}
      />

      <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-3 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6 lg:pb-8">
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
              <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[var(--signal)]">Analytics unavailable</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {isLocal ? 'Start Harness Analyzer on this computer, then retry.' : 'Run "harness-analyzer sync" on your Mac, then retry. Your private analytics are stored on the server only for your signed-in account.'}
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

      <footer className="mx-auto mb-[calc(64px+env(safe-area-inset-bottom))] flex w-full max-w-[1440px] items-center justify-between border-x border-t border-[var(--line-strong)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] lg:mb-0">
        <span>Harness Analyzer</span>
        <span className="flex items-center gap-4"><a href="/models" aria-current={tab === 'models' ? 'page' : undefined} className="font-bold text-[var(--ink)] hover:text-[var(--signal)]">Models</a><span>Made by marketmaker.cc</span></span>
      </footer>
    </div>
  );
}
