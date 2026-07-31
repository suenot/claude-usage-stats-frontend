import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { publicApi, setAccessToken } from '../lib/api';
import {
  createAuthorizeUrl,
  exchangeSsoCode,
  hasPrivateAnalyticsAccess,
  hasServiceAccess,
  safeInternalPath,
  type AuthSession,
} from '../lib/auth';
import { parseRoute, pathForPublicProfile, routeKindFromPath } from '../lib/navigation';
import { LeaderboardPage } from './LeaderboardPage';
import { LandingPage, type LandingAuthStatus } from './LandingPage';
import { PublicProfilePage } from './PublicProfilePage';
import { PublicShell, PublicState } from './PublicShell';

const viteEnv = import.meta.env ?? {};
const AUTH_API_URL = (viteEnv.VITE_AUTH_API_URL || 'https://auth.marketmaker.cc/api/v1').replace(/\/$/, '');
const AUTH_SERVICE = viteEnv.VITE_AUTH_SERVICE || 'harness-analyzer';
const CALLBACK_PATH = '/auth/callback';
const LOCAL_TOKEN_KEY = 'harness_analyzer_auth_token';

interface HarnessAuthContextValue {
  session: AuthSession;
  logout: () => void;
  ownHandle?: string | null;
  updateOwnHandle: (handle: string) => void;
}

const HarnessAuthContext = createContext<HarnessAuthContextValue | null>(null);

function isLoopbackHost(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function callbackUrl(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function requestedAppPath(): string {
  const current = safeInternalPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  return current === '/' || current.startsWith(CALLBACK_PATH) ? '/dashboard' : current;
}

async function readSession(token?: string): Promise<Response> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return fetch(`${AUTH_API_URL}/auth/session`, {
    credentials: 'include',
    headers,
  });
}

function CallbackProgress() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-4 text-[var(--ink)]">
      <section aria-live="polite" className="w-full max-w-xl border-2 border-[var(--line-strong)] bg-[var(--paper)] p-5 sm:p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Harness Analyzer / Access</p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.06em]">Completing sign in</h1>
      </section>
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<LandingAuthStatus>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [ownHandle, setOwnHandle] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPathname);
    return () => window.removeEventListener('popstate', syncPathname);
  }, []);

  useEffect(() => {
    if (!session) {
      setOwnHandle(undefined);
      return;
    }
    let cancelled = false;
    publicApi.getSharing()
      .then(settings => { if (!cancelled) setOwnHandle(settings.handle || null); })
      .catch(() => { if (!cancelled) setOwnHandle(null); });
    return () => { cancelled = true; };
  }, [session?.user_id]);

  useEffect(() => {
    if (!session || !ownHandle) return;
    const currentRoute = parseRoute(pathname);
    if (currentRoute.kind !== 'app' || currentRoute.tab !== 'dashboard') return;
    const canonicalPath = pathForPublicProfile(ownHandle);
    window.history.replaceState(null, '', canonicalPath);
    setPathname(canonicalPath);
  }, [session?.user_id, ownHandle, pathname]);

  useEffect(() => {
    let cancelled = false;

    const acceptSession = (nextSession: AuthSession) => {
      if (!nextSession.token || !hasServiceAccess(nextSession, AUTH_SERVICE)) {
        setAccessToken(null);
        setSession(null);
        setStatus('forbidden');
        return;
      }
      if (isLoopbackHost()) window.sessionStorage.setItem(LOCAL_TOKEN_KEY, nextSession.token);
      setAccessToken(nextSession.token);
      setSession(nextSession);
      setStatus('authenticated');
      setMessage(null);
    };

    (async () => {
      try {
        if (routeKindFromPath(window.location.pathname) === 'callback') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          const returnPath = safeInternalPath(params.get('state'));
          if (!code) throw new Error('The sign-in link is missing its authorization code.');
          const response = await exchangeSsoCode(AUTH_API_URL, code, callbackUrl());
          if (!response.ok) throw new Error('The sign-in link expired. Start a new sign-in.');
          const nextSession = await response.json() as AuthSession;
          if (cancelled) return;
          window.history.replaceState(null, '', returnPath);
          setPathname(returnPath);
          acceptSession(nextSession);
          return;
        }

        const storedToken = isLoopbackHost() ? window.sessionStorage.getItem(LOCAL_TOKEN_KEY) || undefined : undefined;
        let response = await readSession(storedToken);
        if (response.status === 401 && storedToken) {
          window.sessionStorage.removeItem(LOCAL_TOKEN_KEY);
          response = await readSession();
        }
        if (cancelled) return;
        if (response.status === 401) {
          setAccessToken(null);
          setSession(null);
          setStatus('anonymous');
          return;
        }
        if (!response.ok) throw new Error(`Authentication service returned ${response.status}.`);
        acceptSession(await response.json() as AuthSession);
      } catch (cause) {
        if (cancelled) return;
        if (routeKindFromPath(window.location.pathname) === 'callback') {
          window.history.replaceState(null, '', '/');
          setPathname('/');
        }
        setAccessToken(null);
        setSession(null);
        setStatus('error');
        setMessage(cause instanceof Error ? cause.message : 'Authentication is unavailable.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = () => {
    window.location.assign(createAuthorizeUrl(AUTH_API_URL, callbackUrl(), requestedAppPath()));
  };

  const logout = async () => {
    setAccessToken(null);
    setSession(null);
    setStatus('anonymous');
    window.sessionStorage.removeItem(LOCAL_TOKEN_KEY);
    try {
      await fetch(`${AUTH_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      window.history.pushState(null, '', '/');
      setPathname('/');
    }
  };

  const routeKind = routeKindFromPath(pathname);
  const route = parseRoute(pathname);
  if (routeKind === 'callback' && status === 'checking') return <CallbackProgress />;

  if (route.kind === 'landing') {
    return (
      <LandingPage
        status={status}
        session={session}
        message={message}
        onSignIn={signIn}
        onSignOut={logout}
        ownHandle={ownHandle}
        showPrivateNavigation={Boolean(session && (isLoopbackHost() || hasPrivateAnalyticsAccess(session, AUTH_SERVICE)))}
      />
    );
  }

  const publicAuth = {
    status,
    session,
    onSignIn: signIn,
    ownHandle,
    showPrivateNavigation: Boolean(session && (isLoopbackHost() || hasPrivateAnalyticsAccess(session, AUTH_SERVICE))),
  };
  if (route.kind === 'leaderboard') return <LeaderboardPage auth={publicAuth} />;
  if (route.kind === 'public-profile') {
    const canOpenOwnLocalDashboard = session
      && ownHandle === route.handle
      && (isLoopbackHost() || hasPrivateAnalyticsAccess(session, AUTH_SERVICE));
    if (session && ownHandle === undefined) {
      return <PublicShell auth={publicAuth}><div className="min-h-[70dvh] animate-pulse border-2 border-[var(--line-strong)] bg-[var(--paper-deep)]" aria-label="Loading profile access" /></PublicShell>;
    }
    if (canOpenOwnLocalDashboard) {
      return <HarnessAuthContext.Provider value={{ session, logout, ownHandle, updateOwnHandle: setOwnHandle }}>{children}</HarnessAuthContext.Provider>;
    }
    return <PublicProfilePage handle={route.handle} auth={publicAuth} />;
  }
  if (route.kind === 'not-found') {
    return (
      <PublicShell auth={publicAuth}>
        <PublicState
          eyebrow="Harness Analyzer / 404"
          title="Page not found"
          body="The requested page does not exist."
          action={<a href="/" className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Go home</a>}
        />
      </PublicShell>
    );
  }

  if (!session) {
    return (
      <LandingPage
        status={status}
        session={session}
        message={message}
        onSignIn={signIn}
        onSignOut={logout}
        ownHandle={ownHandle}
        showPrivateNavigation={Boolean(session && (isLoopbackHost() || hasPrivateAnalyticsAccess(session, AUTH_SERVICE)))}
      />
    );
  }

  if (route.kind === 'app' && !isLoopbackHost() && !hasPrivateAnalyticsAccess(session, AUTH_SERVICE)) {
    return (
      <PublicShell auth={publicAuth}>
        <PublicState
          eyebrow="Harness Analyzer / Local analytics"
          title="Open locally"
          body="Private telemetry is available only on the computer that stores it. You can manage sharing from your profile or browse public users here."
          action={<div className="flex flex-wrap gap-2"><a href="/profile" className="inline-flex min-h-11 items-center bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Profile</a><a href="/users" className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Users</a></div>}
        />
      </PublicShell>
    );
  }

  return (
    <HarnessAuthContext.Provider value={{ session, logout, ownHandle, updateOwnHandle: setOwnHandle }}>
      {children}
    </HarnessAuthContext.Provider>
  );
}

export function useHarnessAuth(): HarnessAuthContextValue {
  const context = useContext(HarnessAuthContext);
  if (!context) throw new Error('useHarnessAuth must be used inside AuthGate');
  return context;
}
