export const tabs = ['dashboard', 'sessions', 'projects', 'models'] as const;

export type Tab = typeof tabs[number];

export type AppRoute =
  | { kind: 'landing' }
  | { kind: 'callback' }
  | { kind: 'leaderboard' }
  | { kind: 'public-profile'; handle: string }
  | { kind: 'profile' }
  | { kind: 'app'; tab: Tab }
  | { kind: 'not-found' };

export type RouteKind = 'landing' | 'callback' | 'public' | 'protected' | 'not-found';

const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_HANDLES = new Set([
  'admin', 'api', 'auth', 'dashboard', 'leaderboard', 'login', 'logout', 'me',
  'models', 'profile', 'projects', 'public', 'sessions', 'settings', 'users',
]);

export function isValidPublicHandle(value: string): boolean {
  const handle = value.trim().toLowerCase();
  return handle.length >= 2
    && handle.length <= 40
    && HANDLE_PATTERN.test(handle)
    && !RESERVED_HANDLES.has(handle);
}

function normalizedPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function parseRoute(pathname: string): AppRoute {
  const path = normalizedPath(pathname);
  if (path === '/') return { kind: 'landing' };
  if (path === '/auth/callback') return { kind: 'callback' };
  if (path === '/users') return { kind: 'leaderboard' };
  if (path === '/profile') return { kind: 'profile' };

  const publicMatch = path.match(/^\/u\/([^/]+)$/);
  if (publicMatch) {
    const handle = publicMatch[1].toLowerCase();
    return isValidPublicHandle(handle)
      ? { kind: 'public-profile', handle }
      : { kind: 'not-found' };
  }

  const tab = path.slice(1);
  if (tabs.includes(tab as Tab)) return { kind: 'app', tab: tab as Tab };
  return { kind: 'not-found' };
}

export function routeKindFromPath(pathname: string): RouteKind {
  const route = parseRoute(pathname);
  if (route.kind === 'landing' || route.kind === 'callback' || route.kind === 'not-found') return route.kind;
  if (route.kind === 'leaderboard' || route.kind === 'public-profile') return 'public';
  return 'protected';
}

export function pathForTab(tab: Tab): string {
  return `/${tab}`;
}

export function pathForPublicProfile(handle: string): string {
  const normalized = handle.trim().toLowerCase();
  if (!isValidPublicHandle(normalized)) throw new Error('Invalid public handle');
  return `/u/${encodeURIComponent(normalized)}`;
}

export function tabFromPath(pathname: string): Tab {
  const route = parseRoute(pathname);
  return route.kind === 'app' ? route.tab : 'dashboard';
}

export function shouldHandleSpaNavigation(event: {
  button: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): boolean {
  return event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}
