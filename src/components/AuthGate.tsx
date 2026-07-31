import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAccessToken } from '../lib/api';
import {
  createAuthorizeUrl,
  exchangeSsoCode,
  hasServiceAccess,
  safeInternalPath,
  type AuthSession,
} from '../lib/auth';
import { routeKindFromPath } from '../lib/navigation';
import { LandingPage, type LandingAuthStatus } from './LandingPage';

const viteEnv = import.meta.env ?? {};
const AUTH_API_URL = (viteEnv.VITE_AUTH_API_URL || 'https://auth.marketmaker.cc/api/v1').replace(/\/$/, '');
const AUTH_SERVICE = viteEnv.VITE_AUTH_SERVICE || 'harness-analyzer';
const CALLBACK_PATH = '/auth/callback';
const LOCAL_TOKEN_KEY = 'harness_analyzer_auth_token';

interface HarnessAuthContextValue {
  session: AuthSession;
  logout: () => void;
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
    }
  };

  const routeKind = routeKindFromPath(window.location.pathname);
  if (routeKind === 'callback' && status === 'checking') return <CallbackProgress />;

  if (routeKind === 'landing' || !session) {
    return (
      <LandingPage
        status={status}
        session={session}
        message={message}
        onSignIn={signIn}
        onSignOut={logout}
      />
    );
  }

  return (
    <HarnessAuthContext.Provider value={{ session, logout }}>
      {children}
    </HarnessAuthContext.Provider>
  );
}

export function useHarnessAuth(): HarnessAuthContextValue {
  const context = useContext(HarnessAuthContext);
  if (!context) throw new Error('useHarnessAuth must be used inside AuthGate');
  return context;
}
