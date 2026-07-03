import { useState } from 'react';
import type { DateRange } from '../lib/api';
import { SourceChart } from './SourceChart';
import { ModelChart } from './ModelChart';

// Local (UTC+3 on this machine) "YYYY-MM-DDTHH:MM" — matches <input type="datetime-local">.
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

const WEEK_PRESET = PRESETS.find((p) => p.key === 'week')!;

export function PieSection() {
  // Default to the current weekly window (Friday 01:00 → now).
  const [range, setRange] = useState<DateRange>(() => WEEK_PRESET.range());
  const [preset, setPreset] = useState<PresetKey>('week');

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPreset(p.key);
    setRange(p.range());
  };
  const setBound = (key: 'from' | 'to', value: string) => {
    setPreset('custom');
    setRange((r) => ({ ...r, [key]: value || undefined }));
  };

  const inputStyle = {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(148,163,184,0.2)',
    colorScheme: 'dark' as const,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: 'var(--bg-card)' }}>
        <span className="text-sm font-medium mr-1" style={{ color: 'var(--text-secondary)' }}>Диапазон:</span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs rounded-md transition-colors"
              style={{
                background: preset === p.key ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                color: preset === p.key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="datetime-local"
            value={range.from || ''}
            max={range.to || undefined}
            onChange={(e) => setBound('from', e.target.value)}
            className="px-2 py-1 text-xs rounded-md"
            style={inputStyle}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>→</span>
          <input
            type="datetime-local"
            value={range.to || ''}
            min={range.from || undefined}
            onChange={(e) => setBound('to', e.target.value)}
            className="px-2 py-1 text-xs rounded-md"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SourceChart range={range} />
        <ModelChart range={range} />
      </div>
    </div>
  );
}
