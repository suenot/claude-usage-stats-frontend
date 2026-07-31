import type { MouseEvent } from 'react';
import type { AuthSession } from '../lib/auth';
import { pathForTab, pathForUserTab, userTabs, type UserTab } from '../lib/navigation';

const tabLabels: Record<UserTab, string> = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  projects: 'Projects',
};

interface SiteHeaderProps {
  session: AuthSession | null;
  activeTab?: UserTab;
  profileActive?: boolean;
  publicOnly?: boolean;
  userHandle?: string | null;
  authStatus?: 'checking' | 'anonymous' | 'authenticated' | 'forbidden' | 'error';
  onSignIn?: () => void;
  onNavigateTab?: (event: MouseEvent<HTMLAnchorElement>, tab: UserTab) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function SiteHeader({
  session,
  activeTab,
  profileActive,
  publicOnly = false,
  userHandle,
  authStatus,
  onSignIn,
  onNavigateTab,
  onRefresh,
  refreshing,
}: SiteHeaderProps) {
  return (
    <header className="app-header">
      <div className="mx-auto grid min-h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-stretch lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <a href="/" className="flex min-w-0 items-center border-r border-[var(--line-strong)] px-3 no-underline md:px-5" aria-label="Harness Analyzer home">
          <img src="/harness-analyzer-logo.png" alt="" aria-hidden="true" className="h-11 w-11 shrink-0 object-contain mix-blend-multiply" />
          <div className="ml-3 min-w-0">
            <p className="truncate text-base font-black uppercase leading-none tracking-[-0.035em] md:text-lg">Harness Analyzer</p>
            <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">Usage telemetry</p>
          </div>
        </a>

        <nav aria-label="Primary navigation" className="app-nav">
          <div className={`grid h-full ${publicOnly ? 'grid-cols-1' : 'grid-cols-4'} md:flex md:justify-end`}>
            {!publicOnly && userTabs.map(tab => (
              <a
                key={tab}
                href={userHandle ? pathForUserTab(userHandle, tab) : pathForTab(tab)}
                onClick={event => onNavigateTab?.(event, tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className="app-nav-link"
              >
                {tabLabels[tab]}
              </a>
            ))}
            <a href="/users" className="app-nav-link">Users</a>
          </div>
        </nav>

        <div className="flex items-stretch">
          {session && (
            <a href="/profile" aria-current={profileActive ? 'page' : undefined} className="inline-flex min-h-11 max-w-40 items-center truncate border-r border-[var(--line-strong)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--muted)] hover:bg-[var(--ink)] hover:text-[var(--paper)] md:px-4" title={session.email}>
              {session.email}
            </a>
          )}
          {onRefresh && (
            <button type="button" onClick={onRefresh} disabled={refreshing} className="min-h-11 min-w-24 border-0 bg-[var(--signal)] px-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white transition-[background-color,transform] hover:bg-[var(--ink)] active:translate-y-px disabled:cursor-wait disabled:opacity-60 md:min-w-32 md:px-5">
              {refreshing ? 'Collecting' : 'Refresh data'}
            </button>
          )}
          {!session && authStatus === 'checking' ? (
            <span aria-live="polite" className="hidden items-center border-l border-[var(--line-strong)] px-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] sm:inline-flex">Checking</span>
          ) : !session ? (
            <button type="button" onClick={onSignIn} className="border-0 border-l border-[var(--line-strong)] bg-[var(--signal)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white hover:bg-[var(--ink)] sm:px-5">Sign in</button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
