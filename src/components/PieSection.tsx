import { useState } from 'react';
import type { DateRange } from '../lib/api';
import { SourceChart } from './SourceChart';
import { ModelChart } from './ModelChart';

// Local (UTC+3 on this machine) YYYY-MM-DD — not toISOString, which is UTC.
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function lastFriday(): Date {
  const d = new Date();
  const diff = (d.getDay() - 5 + 7) % 7; // Fri = 5; Claude's weekly limits reset Friday
  d.setDate(d.getDate() - diff);
  return d;
}
function monthStart(): Date { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }

type PresetKey = 'all' | 'week' | '7d' | '30d' | 'month' | 'custom';

const PRESETS: { key: PresetKey; label: string; range: () => DateRange }[] = [
  { key: 'all', label: 'Все время', range: () => ({}) },
  { key: 'week', label: 'Неделя (с пт)', range: () => ({ from: fmt(lastFriday()), to: fmt(new Date()) }) },
  { key: '7d', label: '7 дней', range: () => ({ from: fmt(daysAgo(6)), to: fmt(new Date()) }) },
  { key: '30d', label: '30 дней', range: () => ({ from: fmt(daysAgo(29)), to: fmt(new Date()) }) },
  { key: 'month', label: 'Этот месяц', range: () => ({ from: fmt(monthStart()), to: fmt(new Date()) }) },
];

export function PieSection() {
  const [range, setRange] = useState<DateRange>({});
  const [preset, setPreset] = useState<PresetKey>('all');

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
            type="date"
            value={range.from || ''}
            max={range.to || undefined}
            onChange={(e) => setBound('from', e.target.value)}
            className="px-2 py-1 text-xs rounded-md"
            style={inputStyle}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>→</span>
          <input
            type="date"
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
