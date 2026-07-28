const BASE = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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

export interface ProjectEntry {
  cwd: string;
  cost: number;
  sessions: number;
  sources: string[];
  models: string[];
}

export interface DateRange {
  from?: string;
  to?: string;
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
  getHeatmap: () => fetchJson<HeatmapEntry[]>('/charts/heatmap'),
  getHourly: (range?: DateRange) => fetchJson<HourlyEntry[]>(`/charts/hourly${rangeQs(range)}`),
  getSources: (range?: DateRange) => fetchJson<Record<string, number>>(`/charts/sources${rangeQs(range)}`),
  getModels: (range?: DateRange) => fetchJson<Record<string, number>>(`/charts/models${rangeQs(range)}`),
  collectData: () => fetchJson<{ message: string; sessions: number }>('/collect'),
};
