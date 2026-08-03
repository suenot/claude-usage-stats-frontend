const viteEnv = import.meta.env ?? {};
const LOOPBACK_API = 'http://127.0.0.1:3001/api';
const browserIsLoopback = typeof window === 'undefined' || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const BASE = (browserIsLoopback ? (viteEnv.VITE_API_URL || '/api') : LOOPBACK_API).replace(/\/$/, '');
const PUBLIC_BASE = (viteEnv.VITE_PUBLIC_API_URL || (
  viteEnv.PROD ? BASE : 'https://harness-analyzer-api.marketmaker.cc/api'
)).replace(/\/$/, '');
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ? `${message} (${status})` : `API error: ${status}`);
    this.name = 'ApiError';
  }
}

async function fetchJsonAt<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) {
    const payload = await res.clone().json().catch(() => null) as { error?: string; message?: string } | null;
    throw new ApiError(res.status, payload?.error || payload?.message);
  }
  return res.json();
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJsonAt<T>(BASE, path, init);
}

export interface Summary {
  generated_at: string;
  today: string;
  current_month: string;
  totals: Record<string, number>;
  today_cost: number;
  week_cost: number;
  month_cost: number;
  active_days: number;
  active_months: number;
  avg_per_active_day: number;
  avg_per_active_month: number;
  median_per_active_day: number;
  median_per_active_month: number;
  session_counts: Record<string, number>;
}

export interface Session {
  date: string;
  time: string;
  source: string;
  file: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  model: string;
  title?: string;
  sessionId?: string;
  cwd?: string;
  history?: { role: string; text: string }[];
}

export interface SessionsResponse {
  total: number;
  sessions: Session[];
}

export interface DailyChartEntry {
  date: string;
  sources: Record<string, number>;
}

export interface DailyModelEntry {
  date: string;
  models: Record<string, number>;
  tokens: Record<string, number>;
}

export type HistoryTimeframe = '1d' | '1h';
export type HistoryGroupBy = 'harness' | 'model';

export interface HistoryValue {
  usd: number;
  tokens: number;
}

export interface HistoryBucket {
  timestamp: string;
  values: Record<string, HistoryValue>;
}

export interface HistoryChartResponse {
  timeframe: HistoryTimeframe;
  groupBy: HistoryGroupBy;
  buckets: HistoryBucket[];
}

export interface HeatmapEntry {
  date: string;
  hour: number;
  cost: number;
  sessions: number;
}

export interface HourlyEntry {
  hour: number;
  cost: number;
  // Sessions active during the hour — a long session counts in every hour it spans.
  sessions: number;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
}

export interface CacheModelRow {
  model: string;
  actual: number;
  saved: number;
  cache_read: number;
  hit_rate: number;
}

export interface CacheStats {
  actual_cost: number;
  // What the same traffic would have cost with every cached token billed as
  // fresh input.
  no_cache_cost: number;
  saved: number;
  saved_pct: number;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  hit_rate: number;
  by_model: CacheModelRow[];
}

export type CacheExpiryTtl = '5m' | '1h';

export interface CacheExpiryIncident {
  timestamp: string;
  source: string;
  model: string;
  session_id?: string;
  title?: string;
  project?: string;
  idle_minutes: number;
  ttl: CacheExpiryTtl;
  estimated_tokens: number;
  estimated_cost: number;
  confidence: 'estimated';
}

export interface CacheExpiryBucket {
  cost: number;
  tokens: number;
  incidents: number;
}

export interface CacheExpiryStats {
  estimated_lost_cost: number;
  estimated_expired_tokens: number;
  incidents: number;
  total_idle_minutes: number;
  by_ttl: Record<CacheExpiryTtl, CacheExpiryBucket>;
  by_model: Array<{
    model: string;
    cost: number;
    tokens: number;
    incidents: number;
  }>;
  top_incidents: CacheExpiryIncident[];
  coverage: {
    eligible_sessions: number;
    excluded_sessions: number;
    analyzed_events: number;
    sources: string[];
  };
  methodology: 'heuristic-v1';
}

export interface ProjectBreakdownEntry {
  usd: number;
  tokens: number;
  sessions: number;
}

export interface ProjectEntry {
  cwd: string;
  cost: number;
  tokens: number;
  sessions: number;
  sources: string[];
  models: string[];
  byModel: Record<string, ProjectBreakdownEntry>;
  byHarness: Record<string, ProjectBreakdownEntry>;
}

export interface ModelPrice {
  id: string;
  name: string;
  provider: string;
  contextLength: number | null;
  hasPricingOverrides: boolean;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cacheReadPerMillion: number | null;
  cacheWritePerMillion: number | null;
}

export interface ModelPricingResponse {
  source: 'OpenRouter';
  fetchedAt: string;
  stale: boolean;
  models: ModelPrice[];
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface UsageBreakdownEntry {
  cost: number;
  sessions: number;
  tokens: number;
}

export type UsageBreakdown = Record<string, UsageBreakdownEntry>;

export type SharingVisibility = 'private' | 'totals' | 'details';

export interface SharingSettings {
  handle: string;
  display_name: string;
  visibility: SharingVisibility;
  leaderboard_opt_in: boolean;
  snapshot_generated_at: string | null;
}

export interface PublicSnapshotTotals {
  total_cost: number;
  total_tokens: number;
  total_sessions: number;
  active_days: number;
  active_months: number;
  today_cost: number;
  week_cost: number;
  month_cost: number;
  avg_per_active_day: number;
  avg_per_active_month: number;
  median_per_active_day: number;
  median_per_active_month: number;
}

export interface PublicSnapshotDetails {
  history: HistoryChartResponse;
  by_harness: UsageBreakdown;
  by_model: UsageBreakdown;
  hourly: HourlyEntry[];
  heatmap?: HeatmapEntry[];
  cache?: CacheStats;
  cache_expiry?: Omit<CacheExpiryStats, 'top_incidents'>;
}

export interface PublicSnapshotV1 {
  schema_version: 1;
  generated_at: string;
  totals: PublicSnapshotTotals;
  details?: PublicSnapshotDetails;
}

export interface PublicUserProfile {
  handle: string;
  display_name: string;
  visibility: Exclude<SharingVisibility, 'private'>;
  snapshot: PublicSnapshotV1;
}

export type LeaderboardMetric = 'tokens' | 'cost' | 'sessions';

export interface LeaderboardUser {
  rank: number;
  handle: string;
  display_name: string;
  value: number;
  generated_at: string;
}

export interface LeaderboardResponse {
  metric: LeaderboardMetric;
  users: LeaderboardUser[];
}

function rangeQs(range?: DateRange): string {
  if (!range) return '';
  const p = new URLSearchParams();
  if (range.from) p.set('from', range.from);
  if (range.to) p.set('to', range.to);
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  getSummary: () => fetchJson<Summary>('/summary'),
  getSessions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJson<SessionsResponse>(`/sessions${qs}`);
  },
  getProjects: () => fetchJson<ProjectEntry[]>('/projects'),
  getDailyChart: (days = 30) => fetchJson<DailyChartEntry[]>(`/charts/daily?days=${days}`),
  getDailyModels: (days = 30) => fetchJson<DailyModelEntry[]>(`/charts/daily-models?days=${days}`),
  getHistory: (timeframe: HistoryTimeframe, groupBy: HistoryGroupBy, days = 0) => {
    const qs = new URLSearchParams({ timeframe, groupBy, days: String(days) });
    return fetchJson<HistoryChartResponse>(`/charts/history?${qs}`);
  },
  getHeatmap: (range?: DateRange) => fetchJson<HeatmapEntry[]>(`/charts/heatmap${rangeQs(range)}`),
  getHourly: (range?: DateRange) => fetchJson<HourlyEntry[]>(`/charts/hourly${rangeQs(range)}`),
  getCache: (range?: DateRange) => fetchJson<CacheStats>(`/charts/cache${rangeQs(range)}`),
  getCacheExpiry: (range?: DateRange) => fetchJson<CacheExpiryStats>(`/charts/cache-expiry${rangeQs(range)}`),
  getSources: (range?: DateRange) => fetchJson<Record<string, number>>(`/charts/sources${rangeQs(range)}`),
  getSourceUsage: (range?: DateRange) => fetchJson<UsageBreakdown>(`/charts/source-usage${rangeQs(range)}`),
  getModels: (range?: DateRange) => fetchJson<Record<string, number>>(`/charts/models${rangeQs(range)}`),
  getModelUsage: (range?: DateRange) => fetchJson<UsageBreakdown>(`/charts/model-usage${rangeQs(range)}`),
  getModelPricing: (force = false) => fetchJson<ModelPricingResponse>(`/models/pricing${force ? '?refresh=1' : ''}`),
  collectData: () => fetchJson<{ message: string; sessions: number }>('/collect', { method: 'POST' }),
  exportPublicSnapshot: (level: Exclude<SharingVisibility, 'private'>) => (
    fetchJson<PublicSnapshotV1>(`/me/public-snapshot-source?level=${level}`)
  ),
};

export const publicApi = {
  getSharing: () => fetchJsonAt<SharingSettings>(PUBLIC_BASE, '/me/sharing'),
  updateSharing: (settings: Partial<Pick<SharingSettings, 'handle' | 'display_name' | 'visibility' | 'leaderboard_opt_in'>>) => (
    fetchJsonAt<SharingSettings>(PUBLIC_BASE, '/me/sharing', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  ),
  publishSnapshot: (snapshot: PublicSnapshotV1) => (
    fetchJsonAt<{ ok: true; generated_at: string }>(PUBLIC_BASE, '/me/public-snapshot', {
      method: 'PUT',
      body: JSON.stringify(snapshot),
    })
  ),
  createSyncToken: () => (
    fetchJsonAt<{ token: string }>(PUBLIC_BASE, '/me/sync-token', { method: 'POST' })
  ),
  revokeSyncToken: () => (
    fetchJsonAt<{ ok: true }>(PUBLIC_BASE, '/me/sync-token', { method: 'DELETE' })
  ),
  getUser: (handle: string) => (
    fetchJsonAt<PublicUserProfile>(PUBLIC_BASE, `/public/users/${encodeURIComponent(handle)}`)
  ),
  getLeaderboard: (metric: LeaderboardMetric, limit = 50) => {
    const qs = new URLSearchParams({ metric, limit: String(limit) });
    return fetchJsonAt<LeaderboardResponse>(PUBLIC_BASE, `/public/leaderboard?${qs}`);
  },
};
