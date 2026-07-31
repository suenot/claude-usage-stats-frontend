import type { HeatmapEntry } from './api';

export interface RecurringHour {
  hour: number;
  activeDays: number;
  recurrencePct: number;
  costSharePct: number;
}

export interface PeakHoursAnalytics {
  activeDays: number;
  mostConsistentHour: number | null;
  peakRepeatabilityPct: number;
  spikeDependencyPct: number;
  recurringHours: RecurringHour[];
}

export function buildPeakHoursAnalytics(entries: HeatmapEntry[]): PeakHoursAnalytics {
  const cells = new Map<string, { date: string; hour: number; cost: number; sessions: number }>();

  for (const entry of entries) {
    if (!Number.isInteger(entry.hour) || entry.hour < 0 || entry.hour > 23) continue;
    const cost = Number.isFinite(entry.cost) ? Math.max(entry.cost, 0) : 0;
    const sessions = Number.isFinite(entry.sessions) ? Math.max(entry.sessions, 0) : 0;
    const key = `${entry.date}|${entry.hour}`;
    const cell = cells.get(key) || { date: entry.date, hour: entry.hour, cost: 0, sessions: 0 };
    cell.cost += cost;
    cell.sessions += sessions;
    cells.set(key, cell);
  }

  const activeCells = [...cells.values()].filter(cell => cell.cost > 0 || cell.sessions > 0);
  const activeDays = new Set(activeCells.map(cell => cell.date)).size;
  const totalCost = activeCells.reduce((total, cell) => total + cell.cost, 0);
  const hourStats = new Map<number, { dates: Set<string>; cost: number }>();

  for (const cell of activeCells) {
    const stat = hourStats.get(cell.hour) || { dates: new Set<string>(), cost: 0 };
    stat.dates.add(cell.date);
    stat.cost += cell.cost;
    hourStats.set(cell.hour, stat);
  }

  const recurringHours = [...hourStats.entries()]
    .map(([hour, stat]) => ({
      hour,
      activeDays: stat.dates.size,
      recurrencePct: activeDays > 0 ? (stat.dates.size / activeDays) * 100 : 0,
      costSharePct: totalCost > 0 ? (stat.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.recurrencePct - a.recurrencePct || b.costSharePct - a.costSharePct || a.hour - b.hour);

  const peakCell = activeCells.reduce<typeof activeCells[number] | null>(
    (peak, cell) => !peak || cell.cost > peak.cost ? cell : peak,
    null,
  );
  const peakHour = peakCell ? recurringHours.find(hour => hour.hour === peakCell.hour) : undefined;

  return {
    activeDays,
    mostConsistentHour: recurringHours[0]?.hour ?? null,
    peakRepeatabilityPct: peakHour?.recurrencePct ?? 0,
    spikeDependencyPct: peakCell && totalCost > 0 ? (peakCell.cost / totalCost) * 100 : 0,
    recurringHours: recurringHours.slice(0, 5),
  };
}

export function formatHour(value: number | null): string {
  if (value === null) return '--';
  return `${String(value).padStart(2, '0')}:00`;
}
