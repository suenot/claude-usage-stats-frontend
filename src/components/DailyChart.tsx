import { useMemo, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
  type TooltipItem,
} from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DailyModelEntry, type DateRange } from '../lib/api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const MODEL_COLORS: Record<string, string> = {
  'Opus': '#a78bfa',
  'Sonnet': '#60a5fa',
  'Haiku': '#34d399',
  'Fable': '#f472b6',
  'GLM 5.2': '#22d3ee',
};
const colorFor = (model: string) => MODEL_COLORS[model] || '#94a3b8';

// Same hue, low alpha — used to grey out bars outside the selected range.
function fade(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
function fmtLong(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}, ${WEEKDAYS[new Date(+y, +m - 1, +d).getDay()]}`;
}
const fmtShort = (date: string) => `${date.slice(8)}.${date.slice(5, 7)}`;
const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(v < 10 ? 2 : 0)}`);

interface Day { date: string; models: Record<string, number>; total: number }

// Backend pads the series with every calendar day from the first session to
// today. Here that means 135 days for 27 with actual spend — a 3-month void
// that squashes all real bars into a quarter of the canvas. Drop runs of 3+
// consecutive empty days (and any empty head/tail) so long gaps collapse,
// while an isolated day off still shows up as a real gap in the bars.
function compact(entries: DailyModelEntry[]): Day[] {
  const days: Day[] = entries.map(e => ({
    date: e.date,
    models: e.models,
    total: Object.values(e.models).reduce((s, v) => s + v, 0),
  }));
  let head = 0;
  while (head < days.length && days[head].total === 0) head++;
  let tail = days.length - 1;
  while (tail >= 0 && days[tail].total === 0) tail--;

  const out: Day[] = [];
  for (let i = head; i <= tail; i++) {
    if (days[i].total > 0) { out.push(days[i]); continue; }
    let a = i; while (a > head && days[a - 1].total === 0) a--;
    let b = i; while (b < tail && days[b + 1].total === 0) b++;
    if (b - a + 1 < 3) out.push(days[i]);
  }
  return out;
}

export function DailyChart({ range, onRangeChange }: { range?: DateRange; onRangeChange?: (r: DateRange) => void }) {
  // days=0 → full history; the empty stretches get compacted away below.
  const { data, loading } = useApi(() => api.getDailyModels(0), []);
  const chartRef = useRef<ChartJS<'bar', number[], string> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ left: number; right: number; days: number; total: number } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const days = useMemo(() => (data ? compact(data) : []), [data]);

  // Model families ordered by all-time spend — biggest sits at the bottom of
  // each stack, so the visual baseline stays stable across days.
  const models = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of days) for (const [m, v] of Object.entries(d.models)) totals[m] = (totals[m] || 0) + v;
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  }, [days]);

  // Selection lives entirely in props: no chart→state→chart loop to guard.
  const from = range?.from?.slice(0, 10);
  const to = range?.to?.slice(0, 10);
  const hasRange = !!(from || to);
  const inRange = (date: string) => (!from || date >= from) && (!to || date <= to);

  const selected = useMemo(() => days.filter(d => inRange(d.date)), [days, from, to]);
  const selTotal = selected.reduce((s, d) => s + d.total, 0);
  const selPerModel = useMemo(() => {
    const t: Record<string, number> = {};
    for (const d of selected) for (const [m, v] of Object.entries(d.models)) t[m] = (t[m] || 0) + v;
    return t;
  }, [selected]);

  // --- drag-to-select -------------------------------------------------------
  // Bars sit on a category scale with default padding, so category i spans
  // [left + i*step, left + (i+1)*step] — enough to snap the band to bar edges
  // without asking the chart to re-render on every pointer move.
  const geometry = () => {
    const chart = chartRef.current;
    if (!chart || days.length === 0) return null;
    const { left, right } = chart.chartArea;
    return { left, right, step: (right - left) / days.length };
  };
  const indexAt = (x: number) => {
    const g = geometry();
    if (!g) return 0;
    return Math.max(0, Math.min(days.length - 1, Math.floor((x - g.left) / g.step)));
  };
  const bandFor = (i0: number, i1: number) => {
    const g = geometry()!;
    return { left: g.left + Math.min(i0, i1) * g.step, right: g.left + (Math.max(i0, i1) + 1) * g.step };
  };

  const localX = (e: React.PointerEvent) => {
    const box = wrapRef.current!.getBoundingClientRect();
    return e.clientX - box.left;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const g = geometry();
    if (!g) return;
    const x = localX(e);
    if (x < g.left || x > g.right) return;
    dragRef.current = { startX: x, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const x = localX(e);
    if (Math.abs(x - d.startX) > 3) d.moved = true;
    if (!d.moved) return;
    const i0 = indexAt(d.startX);
    const i1 = indexAt(x);
    const band = bandFor(i0, i1);
    const slice = days.slice(Math.min(i0, i1), Math.max(i0, i1) + 1);
    setDrag({ ...band, days: slice.length, total: slice.reduce((s, v) => s + v.total, 0) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    // A plain click (no drag) clears the range — matches the reset button.
    if (!d.moved) { if (hasRange) onRangeChange?.({}); return; }
    const i0 = indexAt(d.startX);
    const i1 = indexAt(localX(e));
    const a = days[Math.min(i0, i1)].date;
    const b = days[Math.max(i0, i1)].date;
    // Whole-day bounds, so the last selected day is included in full.
    onRangeChange?.({ from: `${a}T00:00`, to: `${b}T23:59` });
  };

  // --- chart config ---------------------------------------------------------
  const chartData = useMemo(() => ({
    labels: days.map(d => fmtShort(d.date)),
    datasets: models.filter(m => !hidden.has(m)).map(m => ({
      label: m,
      data: days.map(d => d.models[m] || 0),
      backgroundColor: days.map(d => (hasRange && !inRange(d.date) ? fade(colorFor(m), 0.16) : colorFor(m))),
      borderRadius: 2,
      maxBarThickness: 34,
    })),
  }), [days, models, hidden, from, to, hasRange]);

  const empty = !loading && days.length === 0;

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Spend by Model</h3>
          <div className="flex items-baseline gap-3 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono text-base" style={{ color: 'var(--accent-cyan)' }}>${selTotal.toFixed(2)}</span>
            <span>за {selected.length} {selected.length === 1 ? 'день' : 'дн.'}</span>
            {selected.length > 0 && <span>· ${(selTotal / selected.length).toFixed(2)} / день</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {hasRange && (
            <span className="text-xs font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)' }}>
              {from || '…'} → {to || '…'}
            </span>
          )}
          {hasRange && (
            <button
              onClick={() => onRangeChange?.({})}
              className="px-2.5 py-1 text-xs rounded-md transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Legend doubles as a per-model total for the selection and a series toggle. */}
      <div className="flex flex-wrap gap-2 mb-3">
        {models.map(m => {
          const off = hidden.has(m);
          return (
            <button
              key={m}
              onClick={() => setHidden(prev => {
                const next = new Set(prev);
                if (next.has(m)) next.delete(m); else next.add(m);
                return next;
              })}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-opacity"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', opacity: off ? 0.4 : 1 }}
              title={off ? 'Показать' : 'Скрыть'}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: off ? '#64748b' : colorFor(m) }} />
              <span style={{ textDecoration: off ? 'line-through' : 'none' }}>{m}</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{money(selPerModel[m] || 0)}</span>
            </button>
          );
        })}
      </div>

      {loading && <div className="h-80 animate-pulse rounded-lg" style={{ background: 'rgba(148,163,184,0.08)' }} />}
      {empty && (
        <div className="h-80 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Нет данных
        </div>
      )}

      {!loading && !empty && (
        <div
          ref={wrapRef}
          className="relative select-none"
          style={{ height: 320, cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Bar
            ref={chartRef}
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: !drag,
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  borderColor: 'rgba(148,163,184,0.2)',
                  borderWidth: 1,
                  padding: 10,
                  titleColor: '#f8fafc',
                  bodyColor: '#e2e8f0',
                  footerColor: '#f8fafc',
                  itemSort: (a, b) => (b.parsed.y as number) - (a.parsed.y as number),
                  callbacks: {
                    title: (items: TooltipItem<'bar'>[]) => fmtLong(days[items[0].dataIndex].date),
                    label: (ctx: TooltipItem<'bar'>) => {
                      const v = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                      return v > 0 ? ` ${ctx.dataset.label}: $${v.toFixed(2)}` : '';
                    },
                    footer: (items: TooltipItem<'bar'>[]) =>
                      `Всего: $${items.reduce((s, i) => s + (typeof i.parsed.y === 'number' ? i.parsed.y : 0), 0).toFixed(2)}`,
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 12 },
                  grid: { display: false },
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v) => money(Number(v)) },
                  grid: { color: 'rgba(148,163,184,0.08)' },
                  border: { display: false },
                },
              },
            }}
          />

          {drag && (
            <>
              <div
                className="absolute top-0 bottom-0 pointer-events-none rounded-sm"
                style={{
                  left: drag.left,
                  width: Math.max(drag.right - drag.left, 2),
                  background: 'rgba(34,211,238,0.14)',
                  borderLeft: '1px solid var(--accent-cyan)',
                  borderRight: '1px solid var(--accent-cyan)',
                }}
              />
              <div
                className="absolute top-1 px-2 py-1 rounded-md text-xs font-mono pointer-events-none whitespace-nowrap"
                style={{
                  left: Math.max(0, (drag.left + drag.right) / 2 - 55),
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(34,211,238,0.4)',
                  color: 'var(--accent-cyan)',
                }}
              >
                {drag.days} дн · ${drag.total.toFixed(2)}
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
        Протащи мышью по графику, чтобы выбрать диапазон — пироги и график по часам подхватят его. Клик сбрасывает.
        Дни без трат пропущены, длинные паузы свернуты.
      </p>
    </div>
  );
}
