import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAccessToken } from '../lib/api';
import {
  createAuthorizeUrl,
  createLoginUrl,
  hasServiceAccess,
  safeInternalPath,
  type AuthSession,
} from '../lib/auth';

const AUTH_API_URL = (import.meta.env.VITE_AUTH_API_URL || 'https://auth.marketmaker.cc/api/v1').replace(/\/$/, '');
const AUTH_SERVICE = import.meta.env.VITE_AUTH_SERVICE || 'harness-analyzer';
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

function currentInternalPath(): string {
  return safeInternalPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
}

async function readSession(token?: string): Promise<Response> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return fetch(`${AUTH_API_URL}/auth/session`, {
    credentials: 'include',
    headers,
  });
}

async function exchangeCode(code: string, redirectUri: string): Promise<Response> {
  return fetch(`${AUTH_API_URL}/sso/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
}

function AuthFrame({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-4 text-[var(--ink)]">
      <section className="w-full max-w-xl border-2 border-[var(--line-strong)] bg-[var(--paper)] p-5 sm:p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Harness Analyzer / Access</p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.06em]">{title}</h1>
        {children}
      </section>
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const acceptSession = (nextSession: AuthSession) => {
      if (!nextSession.token || !hasServiceAccess(nextSession, AUTH_SERVICE)) {
        setAccessToken(null);
        setForbidden(true);
        return;
      }
      if (isLoopbackHost()) window.sessionStorage.setItem(LOCAL_TOKEN_KEY, nextSession.token);
      setAccessToken(nextSession.token);
      setSession(nextSession);
    };

    const authorize = () => {
      const callbackUrl = `${window.location.origin}${CALLBACK_PATH}`;
      window.location.replace(createAuthorizeUrl(AUTH_API_URL, callbackUrl, currentInternalPath()));
    };

    (async () => {
      try {
        if (window.location.pathname === CALLBACK_PATH) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (!code) throw new Error('The authorization callback is missing its code.');
          const callbackUrl = `${window.location.origin}${CALLBACK_PATH}`;
          const response = await exchangeCode(code, callbackUrl);
          if (!response.ok) throw new Error('The authorization code is invalid or expired.');
          const nextSession = await response.json() as AuthSession;
          const returnPath = safeInternalPath(params.get('state'));
          window.history.replaceState(null, '', returnPath);
          if (!cancelled) acceptSession(nextSession);
          return;
        }

        const storedToken = isLoopbackHost() ? window.sessionStorage.getItem(LOCAL_TOKEN_KEY) || undefined : undefined;
        let response = await readSession(storedToken);
        if (response.status === 401 && storedToken) {
          window.sessionStorage.removeItem(LOCAL_TOKEN_KEY);
          response = await readSession();
        }
        if (response.status === 401) {
          if (!cancelled) authorize();
          return;
        }
        if (!response.ok) throw new Error(`Authentication service returned ${response.status}.`);
        const nextSession = await response.json() as AuthSession;
        if (!cancelled) acceptSession(nextSession);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Authentication is unavailable.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const logout = async () => {
    setAccessToken(null);
    window.sessionStorage.removeItem(LOCAL_TOKEN_KEY);
    try {
      await fetch(`${AUTH_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      window.location.assign(createLoginUrl(AUTH_API_URL, window.location.origin));
    }
  };

  if (forbidden) {
    return (
      <AuthFrame title="Access denied">
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
          Your MarketMaker account does not have the required admin role for Harness Analyzer.
        </p>
        <button type="button" onClick={logout} className="mt-6 min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase tracking-[0.1em] hover:bg-[var(--ink)] hover:text-[var(--paper)]">
          Sign out
        </button>
      </AuthFrame>
    );
  }

  if (error) {
    return (
      <AuthFrame title="Authentication unavailable">
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt(value => value + 1);
          }}
          className="mt-6 min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[var(--ink)]"
        >
          Retry
        </button>
      </AuthFrame>
    );
  }

  if (!session) return <AuthFrame title="Checking access" />;

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
