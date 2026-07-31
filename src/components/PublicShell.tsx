import type { ReactNode } from 'react';
import type { AuthSession } from '../lib/auth';
import type { LandingAuthStatus } from './LandingPage';
import { SiteHeader } from './SiteHeader';

export interface PublicAuthProps {
  status: LandingAuthStatus;
  session: AuthSession | null;
  onSignIn: () => void;
  ownHandle?: string | null;
  showPrivateNavigation?: boolean;
}

export function PublicShell({ auth, children }: { auth: PublicAuthProps; children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader
        session={auth.session}
        publicOnly={!auth.showPrivateNavigation}
        dashboardPath={auth.ownHandle ? `/u/${encodeURIComponent(auth.ownHandle)}` : '/dashboard'}
        authStatus={auth.status}
        onSignIn={auth.onSignIn}
      />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
      <footer className="mx-auto mb-[calc(64px+env(safe-area-inset-bottom))] flex w-full max-w-[1440px] items-center justify-between border-x border-t border-[var(--line-strong)] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] lg:mb-0">
        <span>Harness Analyzer</span>
        <span>Public aggregates only</span>
      </footer>
    </div>
  );
}

export function PublicState({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: ReactNode }) {
  return (
    <section className="grid min-h-[60dvh] place-items-center border-2 border-[var(--line-strong)] p-5">
      <div className="w-full max-w-2xl">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">{eyebrow}</p>
        <h1 className="mt-3 text-[clamp(2.8rem,8vw,5.5rem)] font-black uppercase leading-[0.85] tracking-[-0.065em]">{title}</h1>
        <p className="mt-6 max-w-xl text-sm leading-6 text-[var(--muted)]">{body}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </section>
  );
}
