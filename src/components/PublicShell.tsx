import type { ReactNode } from 'react';
import type { AuthSession } from '../lib/auth';
import type { LandingAuthStatus } from './LandingPage';

export interface PublicAuthProps {
  status: LandingAuthStatus;
  session: AuthSession | null;
  onSignIn: () => void;
}

export function PublicShell({ auth, children }: { auth: PublicAuthProps; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line-strong)] bg-[var(--paper)]">
        <div className="mx-auto grid min-h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-stretch">
          <a href="/" className="flex min-w-0 items-center px-3 no-underline md:px-5" aria-label="Harness Analyzer home">
            <img src="/harness-analyzer-logo.png" alt="" aria-hidden="true" className="h-11 w-11 shrink-0 object-contain mix-blend-multiply" />
            <div className="ml-3 min-w-0">
              <p className="truncate text-base font-black uppercase leading-none tracking-[-0.035em] md:text-lg">Harness Analyzer</p>
              <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">Public telemetry</p>
            </div>
          </a>
          <div className="flex items-stretch">
            <nav aria-label="Public navigation" className="flex items-stretch">
              <a href="/users" className="inline-flex items-center border-l border-[var(--line-strong)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)] hover:bg-[var(--ink)] hover:text-[var(--paper)] sm:px-5">Users</a>
            </nav>
            {auth.session ? (
              <a href="/profile" className="inline-flex items-center border-l border-[var(--line-strong)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] sm:px-5">
                Profile
              </a>
            ) : auth.status === 'checking' ? (
              <span aria-live="polite" className="hidden items-center border-l border-[var(--line-strong)] px-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] sm:inline-flex">Checking</span>
            ) : (
              <button type="button" onClick={auth.onSignIn} className="border-0 border-l border-[var(--line-strong)] bg-[var(--signal)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white hover:bg-[var(--ink)] sm:px-5">Sign in</button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6">{children}</main>
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between border-x border-t border-[var(--line-strong)] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
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
