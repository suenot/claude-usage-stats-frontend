export const tabs = ['dashboard', 'sessions', 'projects', 'models'] as const;

export type Tab = typeof tabs[number];

export function pathForTab(tab: Tab): string {
  return `/${tab}`;
}

export function tabFromPath(pathname: string): Tab {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const tab = normalizedPath.slice(1);
  return tabs.includes(tab as Tab) ? tab as Tab : 'dashboard';
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
