import { useState } from 'react';
import type { DateRange } from '../lib/api';
import { SourceChart } from './SourceChart';
import { ModelChart } from './ModelChart';
import { HourlyChart } from './HourlyChart';
import { CacheChart } from './CacheChart';

// Local (UTC+3 on this machine) "YYYY-MM-DDTHH:MM" - matches <input type="datetime-local">.
// We format in local time (not toISOString, which is UTC).
function fmtDT(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function atStart(d: Date): Date { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return atStart(d); }
function monthStart(): Date { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
// Most recent Claude weekly reset: Friday 01:00 local (UTC+3). If this week's
// Friday 01:00 hasn't happened yet, step back to the previous Friday.
function lastFridayReset(): Date {
  const now = new Date();
  const d = new Date(now);
  const diff = (d.getDay() - 5 + 7) % 7; // Fri = 5
  d.setDate(d.getDate() - diff);
  d.setHours(1, 0, 0, 0);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

type PresetKey = 'all' | 'week' | '7d' | '30d' | 'month' | 'custom';

const PRESETS: { key: PresetKey; label: string; range: () => DateRange }[] = [
  { key: 'all', label: 'Все время', range: () => ({}) },
  { key: 'week', label: 'Неделя (пт 01:00)', range: () => ({ from: fmtDT(lastFridayReset()), to: fmtDT(new Date()) }) },
  { key: '7d', label: '7 дней', range: () => ({ from: fmtDT(daysAgo(6)), to: fmtDT(new Date()) }) },
  { key: '30d', label: '30 дней', range: () => ({ from: fmtDT(daysAgo(29)), to: fmtDT(new Date()) }) },
  { key: 'month', label: 'Этот месяц', range: () => ({ from: fmtDT(monthStart()), to: fmtDT(new Date()) }) },
];

export function PieSection({ range, setRange }: { range: DateRange; setRange: (r: DateRange) => void }) {
  // `range` is owned by App so the daily chart and the presets stay in sync.
  // We remember which preset produced which bounds; once the range moves on
  // (chart drag, manual input), nothing is highlighted - otherwise a stale
  // "Все время" chip would claim a window it no longer describes.
  const [applied, setApplied] = useState<{ key: PresetKey } & DateRange>({ key: 'all' });
  const active: PresetKey = applied.from === range.from && applied.to === range.to ? applied.key : 'custom';

  const applyPreset = (p: typeof PRESETS[number]) => {
    const r = p.range();
    setApplied({ key: p.key, ...r });
    setRange(r);
  };
  const setBound = (key: 'from' | 'to', value: string) => {
    setRange({ ...range, [key]: value || undefined });
  };

  const inputStyle = {
    background: '#F4F4F0',
    color: '#111111',
    border: '1px solid #111111',
    colorScheme: 'light' as const,
  };

  return (
    <div className="space-y-5">
      <section aria-label="Date range" className="border-2 border-[#111111] bg-[#F4F4F0] p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#66645F]">Range</span>
          <div className="flex flex-wrap gap-px bg-[#111111]">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className={`min-h-11 flex-1 bg-[#F4F4F0] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#111111] transition-colors hover:bg-[#DEDDD7] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010] ${active === p.key ? 'border-b-[3px] border-[#BC1010]' : ''}`}
              style={{
                background: active === p.key ? '#111111' : '#F4F4F0',
                color: active === p.key ? '#F4F4F0' : '#111111',
              }}
            >
              {p.label}
            </button>
          ))}
          </div>
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <input
            type="datetime-local"
            value={range.from || ''}
            max={range.to || undefined}
            onChange={(e) => setBound('from', e.target.value)}
            aria-label="Range start"
            className="min-h-11 min-w-0 px-2 text-xs font-mono focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
            style={inputStyle}
          />
          <span className="hidden font-mono text-xs text-[#66645F] sm:block">&gt;</span>
          <input
            type="datetime-local"
            value={range.to || ''}
            min={range.from || undefined}
            onChange={(e) => setBound('to', e.target.value)}
            aria-label="Range end"
            className="min-h-11 min-w-0 px-2 text-xs font-mono focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
            style={inputStyle}
          />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SourceChart range={range} />
        <ModelChart range={range} />
      </div>

      <HourlyChart range={range} />

      <CacheChart range={range} />
    </div>
  );
}
