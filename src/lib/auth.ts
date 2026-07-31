export interface AuthSession {
  token: string;
  user_id: string;
  email: string;
  username: string;
  services: Record<string, string>;
}

let activeExchange: { key: string; promise: Promise<Response> } | null = null;

export function exchangeSsoCode(
  authApiUrl: string,
  code: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const key = `${code}\n${redirectUri}`;
  if (activeExchange?.key !== key) {
    const promise = fetcher(`${authApiUrl.replace(/\/$/, '')}/sso/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
    activeExchange = { key, promise };
  }
  return activeExchange.promise.then(response => response.clone());
}

export function hasServiceAccess(session: AuthSession, service: string): boolean {
  return ['user', 'superuser', 'admin'].includes(session.services?.[service]);
}

export function hasPrivateAnalyticsAccess(session: AuthSession, service: string): boolean {
  return session.services?.[service] === 'admin';
}

export function safeInternalPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export function createAuthorizeUrl(authApiUrl: string, callbackUrl: string, returnPath: string): string {
  const url = new URL(`${authApiUrl.replace(/\/$/, '')}/sso/authorize`);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('state', safeInternalPath(returnPath));
  return url.toString();
}

export function createLoginUrl(authApiUrl: string, returnUrl: string): string {
  const url = new URL('/login', new URL(authApiUrl).origin);
  url.searchParams.set('return', returnUrl);
  return url.toString();
}
