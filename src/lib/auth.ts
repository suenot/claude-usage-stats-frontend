export interface AuthSession {
  token: string;
  user_id: string;
  email: string;
  username: string;
  services: Record<string, string>;
}

export function hasServiceAccess(session: AuthSession, service: string): boolean {
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
