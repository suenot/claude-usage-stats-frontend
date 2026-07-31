import type { AuthSession } from '../lib/auth';

export type LandingAuthStatus = 'checking' | 'anonymous' | 'authenticated' | 'forbidden' | 'error';

interface LandingPageProps {
  status: LandingAuthStatus;
  session: AuthSession | null;
  message?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

function AuthAction({ status, onSignIn, onSignOut }: Pick<LandingPageProps, 'status' | 'onSignIn' | 'onSignOut'>) {
  const baseClass = 'inline-flex min-h-16 shrink-0 items-center justify-center border-0 border-l border-[var(--line-strong)] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-[background-color,color,transform] active:translate-y-px md:min-w-40';

  if (status === 'authenticated') {
    return <a href="/dashboard" className={`${baseClass} bg-[var(--signal)] text-white hover:bg-[var(--ink)]`}>Open dashboard</a>;
  }
  if (status === 'checking') {
    return <span aria-live="polite" className={`${baseClass} cursor-wait bg-[var(--paper-deep)] text-[var(--muted)]`}>Checking account</span>;
  }
  if (status === 'forbidden') {
    return <button type="button" onClick={onSignOut} className={`${baseClass} bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]`}>Switch account</button>;
  }
  return <button type="button" onClick={onSignIn} className={`${baseClass} bg-[var(--signal)] text-white hover:bg-[var(--ink)]`}>Sign in</button>;
}

export function LandingPage({ status, session, message, onSignIn, onSignOut }: LandingPageProps) {
  const notice = status === 'forbidden'
    ? 'This account does not have Harness Analyzer access. Switch accounts or ask an administrator for access.'
    : message;

  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line-strong)] bg-[var(--paper)]">
        <div className="mx-auto grid min-h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-stretch">
          <a href="/" className="flex min-w-0 items-center px-3 no-underline md:px-5" aria-label="Harness Analyzer home">
            <img src="/harness-analyzer-logo.png" alt="" aria-hidden="true" className="h-11 w-11 shrink-0 object-contain mix-blend-multiply" />
            <div className="ml-3 min-w-0">
              <p className="truncate text-base font-black uppercase leading-none tracking-[-0.035em] md:text-lg">Harness Analyzer</p>
              <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">Local usage telemetry</p>
            </div>
          </a>

          <div className="flex items-stretch">
            <nav aria-label="Landing navigation" className="hidden items-stretch md:flex">
              <a href="/users" className="inline-flex items-center border-l border-[var(--line-strong)] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)] hover:bg-[var(--ink)] hover:text-[var(--paper)]">Users</a>
              <a href="#capabilities" className="inline-flex items-center border-l border-[var(--line-strong)] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)] hover:bg-[var(--ink)] hover:text-[var(--paper)]">Capabilities</a>
              <a href="#method" className="inline-flex items-center border-l border-[var(--line-strong)] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)] hover:bg-[var(--ink)] hover:text-[var(--paper)]">Method</a>
            </nav>
            {session ? (
              <span className="hidden max-w-48 items-center truncate border-l border-[var(--line-strong)] px-4 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--muted)] xl:flex" title={session.email}>
                {session.email}
              </span>
            ) : null}
            <AuthAction status={status} onSignIn={onSignIn} onSignOut={onSignOut} />
          </div>
        </div>
      </header>

      {notice ? (
        <div role="status" className="border-b border-[var(--line-strong)] bg-[#F4E7E2] px-4 py-3 text-center font-mono text-[10px] font-bold uppercase leading-5 tracking-[0.06em] text-[var(--signal)]">
          {notice}
        </div>
      ) : null}

      <main className="mx-auto max-w-[1440px]">
        <section className="grid min-h-[calc(100dvh-65px)] border-x border-[var(--line-strong)] lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
          <div className="flex min-w-0 flex-col justify-between p-5 sm:p-8 lg:p-12">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Local usage telemetry</p>
              <h1 className="mt-7 max-w-5xl text-[clamp(3.5rem,9vw,8.5rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
                Know where your agent budget goes.
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-[var(--muted)] md:text-lg">
                Local cost, token, cache and session analytics for Claude Code and Codex.
              </p>
            </div>
            <a href="#method" className="mt-12 w-fit border-b-2 border-[var(--ink)] pb-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)]">
              See the method
            </a>
          </div>

          <div className="grid min-h-96 border-t border-[var(--line-strong)] bg-[var(--paper-deep)] p-5 lg:border-l lg:border-t-0 lg:p-8">
            <div className="grid place-items-center border border-[var(--line-strong)] bg-[var(--paper)] p-8">
              <img src="/harness-analyzer-logo.png" alt="Harness Analyzer mark" className="w-full max-w-64 object-contain mix-blend-multiply" />
            </div>
            <dl className="grid grid-cols-2 border-x border-b border-[var(--line-strong)] bg-[var(--line-strong)]">
              {[
                ['Sources', 'Claude + Codex'],
                ['Measures', 'USD + tokens'],
                ['Cache TTL', '5m + 1h'],
                ['Storage', 'Local only'],
              ].map(([label, value], index) => (
                <div key={label} className={`bg-[var(--paper)] p-4 ${index % 2 === 0 ? 'border-r border-[var(--line-strong)]' : ''} ${index < 2 ? 'border-b border-[var(--line-strong)]' : ''}`}>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt>
                  <dd className="mt-2 text-sm font-black uppercase tracking-[-0.02em]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="capabilities" className="border-x border-t border-[var(--line-strong)] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <h2 className="max-w-4xl text-[clamp(2.75rem,7vw,6.5rem)] font-black uppercase leading-[0.86] tracking-[-0.065em]">From raw logs to decisions.</h2>
          <div className="mt-12 grid border border-[var(--line-strong)] lg:grid-cols-[1.35fr_0.65fr]">
            <article className="min-h-72 bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
              <h3 className="text-3xl font-black uppercase tracking-[-0.05em] sm:text-5xl">Cache economics</h3>
              <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--paper-deep)]">Measure cache savings and estimate the cost of context rebuilt after long coding pauses.</p>
            </article>
            <div className="grid sm:grid-cols-2 lg:grid-cols-1">
              <article className="border-t border-[var(--line-strong)] p-6 sm:border-r sm:border-t-0 lg:border-b lg:border-r-0">
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">Session ledger</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Trace projects, models, harnesses and activity without losing full names.</p>
              </article>
              <article className="border-t border-[var(--line-strong)] p-6 sm:border-t-0">
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">Range-aware views</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">One selected interval controls hourly activity, peak hours, cache impact and breakdowns.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="method" className="border-x border-t border-[var(--line-strong)] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <h2 className="max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)] font-black uppercase leading-[0.88] tracking-[-0.06em]">Your telemetry stays on your machine.</h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--muted)]">The hosted landing handles identity. Your local API reads agent logs and serves the private dashboard directly to your browser.</p>
          <div className="mt-12 grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)] md:grid-cols-3">
            {[
              ['Read', 'Parse local Claude Code and Codex usage events.'],
              ['Price', 'Apply model-specific input, output and cache rates.'],
              ['Explain', 'Turn sessions into charts, ranges and efficiency signals.'],
            ].map(([title, body]) => (
              <article key={title} className="bg-[var(--paper)] p-6 sm:p-8">
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-2 border border-[var(--line-strong)] px-5 py-5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>Harness Analyzer</span>
        <a href="https://marketmaker.cc" className="hover:text-[var(--signal)]">MarketMaker</a>
      </footer>
    </div>
  );
}
