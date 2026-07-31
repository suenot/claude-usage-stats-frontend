import type { DateRange, HeatmapEntry } from './api';

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

function isHourInRange(date: string, hour: number, range?: DateRange): boolean {
  const hourStart = `${date}T${String(hour).padStart(2, '0')}:00`;
  const hourEnd = `${date}T${String(hour).padStart(2, '0')}:59`;
  const from = range?.from?.length === 10 ? `${range.from}T00:00` : range?.from;
  const to = range?.to?.length === 10 ? `${range.to}T23:59` : range?.to;
  return (!from || hourEnd >= from) && (!to || hourStart <= to);
}

export function buildPeakHoursAnalytics(entries: HeatmapEntry[], range?: DateRange): PeakHoursAnalytics {
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
  const activeDates = [...new Set(activeCells.map(cell => cell.date))];
  const activeDays = activeDates.length;
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
      recurrencePct: (() => {
        const eligibleDays = activeDates.filter(date => isHourInRange(date, hour, range)).length;
        return eligibleDays > 0 ? (stat.dates.size / eligibleDays) * 100 : 0;
      })(),
      costSharePct: totalCost > 0 ? (stat.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.recurrencePct - a.recurrencePct || b.costSharePct - a.costSharePct || a.hour - b.hour);

  const recurrenceByHour = new Map(recurringHours.map(hour => [hour.hour, hour.recurrencePct]));
  const peakCell = activeCells
    .filter(cell => cell.cost > 0)
    .sort((a, b) => (
      b.cost - a.cost
      || (recurrenceByHour.get(b.hour) || 0) - (recurrenceByHour.get(a.hour) || 0)
      || a.date.localeCompare(b.date)
      || a.hour - b.hour
    ))[0] || null;
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
