import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart, HistogramSeries, ColorType,
  type IChartApi, type Time, type IRange,
} from 'lightweight-charts';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';

const MODEL_COLORS: Record<string, string> = {
  'Opus': '#a78bfa',
  'Sonnet': '#60a5fa',
  'Haiku': '#34d399',
  'Fable': '#f472b6',
  'GLM 5.2': '#22d3ee',
};
const colorFor = (model: string) => MODEL_COLORS[model] || '#94a3b8';

// Visible-range bounds as "YYYY-MM-DD", clamped to the data domain.
function visToBounds(vr: IRange<Time> | null, dates: string[]): { from?: string; to?: string } {
  if (!vr || dates.length === 0) return {};
  const f = String(vr.from).slice(0, 10);
  const t = String(vr.to).slice(0, 10);
  return { from: f < dates[0] ? dates[0] : f, to: t > dates[dates.length - 1] ? dates[dates.length - 1] : t };
}

export function DailyChart({ range, onRangeChange }: { range?: DateRange; onRangeChange?: (r: DateRange) => void }) {
  // days=0 → full history. Stacked by model family.
  const { data, loading } = useApi(() => api.getDailyModels(0), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hover, setHover] = useState<{ date: string; rows: [string, number][]; total: number } | null>(null);

  const allDates = useMemo(() => (data ? data.map(d => d.date) : []), [data]);

  // Reflects the from/to currently applied to the chart. Each distinct value
  // flows exactly once (chart→prop or prop→chart), preventing feedback loops.
  const syncedRef = useRef<{ from?: string; to?: string }>({});

  const models = useMemo(() => {
    if (!data) return [] as string[];
    const totals: Record<string, number> = {};
    for (const d of data) for (const [m, cost] of Object.entries(d.models)) totals[m] = (totals[m] || 0) + cost;
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  }, [data]);

  const byDate = useMemo(() => {
    const m: Record<string, { rows: [string, number][]; total: number }> = {};
    if (!data) return m;
    for (const d of data) {
      const rows = Object.entries(d.models).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]) as [string, number][];
      m[d.date] = { rows, total: rows.reduce((s, [, v]) => s + v, 0) };
    }
    return m;
  }, [data]);

  useEffect(() => {
    if (!data || !containerRef.current || models.length === 0) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8', fontFamily: 'Inter, sans-serif', attributionLogo: false },
      grid: { vertLines: { color: 'rgba(148,163,184,0.06)' }, horzLines: { color: 'rgba(148,163,184,0.1)' } },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.15)' },
      timeScale: { borderColor: 'rgba(148,163,184,0.15)', rightOffset: 2, minBarSpacing: 0.5 },
      crosshair: {
        vertLine: { color: 'rgba(148,163,184,0.4)', labelBackgroundColor: '#334155' },
        horzLine: { color: 'rgba(148,163,184,0.4)', labelBackgroundColor: '#334155' },
      },
      // The chart's own pan/zoom is the range selector.
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      autoSize: true,
      localization: { priceFormatter: (p: number) => `$${p.toFixed(2)}` },
    });
    chartRef.current = chart;

    // Stacked histogram per model family (largest cumulative drawn first/behind).
    for (let p = models.length - 1; p >= 0; p--) {
      const s = chart.addSeries(HistogramSeries, {
        color: colorFor(models[p]),
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        priceLineVisible: false, lastValueVisible: false, base: 0,
      });
      const points = data.map((d) => {
        let cum = 0;
        for (let q = 0; q <= p; q++) cum += d.models[models[q]] || 0;
        return { time: d.date as Time, value: cum };
      });
      s.setData(points);
    }

    // Initialize to the incoming range (or full history).
    const initial = range && (range.from || range.to)
      ? { from: (range.from?.slice(0, 10) || allDates[0]) as Time, to: (range.to?.slice(0, 10) || allDates[allDates.length - 1]) as Time }
      : null;
    if (initial) { chart.timeScale().setVisibleRange(initial); syncedRef.current = { from: String(initial.from), to: String(initial.to) }; }
    else { chart.timeScale().fitContent(); }

    chart.subscribeCrosshairMove((param) => {
      const t = param.time as string | undefined;
      if (!t || !byDate[t]) { setHover(null); return; }
      setHover({ date: t, rows: byDate[t].rows, total: byDate[t].total });
    });

    // Native range selection: the visible time range drives the shared range.
    // Debounced so a pan/zoom emits one update, not a stream.
    let t: ReturnType<typeof setTimeout> | undefined;
    const onVis = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const b = visToBounds(chart.timeScale().getVisibleRange(), allDates);
        const cur = syncedRef.current;
        if (b.from === cur.from && b.to === cur.to) return;
        syncedRef.current = b;
        onRangeChange?.(b);
      }, 180);
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(onVis);

    return () => { clearTimeout(t); chart.remove(); chartRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, models, byDate, allDates]);

  // External range changes (preset buttons / datetime inputs) → apply to chart.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || allDates.length === 0) return;
    const next = range && (range.from || range.to)
      ? { from: range.from?.slice(0, 10) || allDates[0], to: range.to?.slice(0, 10) || allDates[allDates.length - 1] }
      : null;
    const cur = syncedRef.current;
    if (next) {
      if (next.from === cur.from && next.to === cur.to) return;
      syncedRef.current = next;
      chart.timeScale().setVisibleRange({ from: next.from as Time, to: next.to as Time });
    } else {
      if (!cur.from && !cur.to) return;
      syncedRef.current = {};
      chart.timeScale().fitContent();
    }
  }, [range?.from, range?.to, allDates]);

  const reset = () => onRangeChange?.({});
  const hasRange = !!(range?.from || range?.to);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Spend by Model</h3>
          {hasRange && (
            <button onClick={reset} className="px-2.5 py-1 text-xs rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Сбросить
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {models.map((m) => (
            <span key={m} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colorFor(m) }} />
              {m}
            </span>
          ))}
        </div>
      </div>

      {hasRange && (
        <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Диапазон: <span style={{ color: 'var(--accent-cyan)' }}>{range!.from?.slice(0, 10) || '—'}</span> → <span style={{ color: 'var(--accent-cyan)' }}>{range!.to?.slice(0, 10) || '—'}</span>
        </div>
      )}

      <div className="relative">
        {loading && <div className="h-72 animate-pulse rounded-lg" style={{ background: 'rgba(148,163,184,0.08)' }} />}
        <div ref={containerRef} style={{ height: 288, width: '100%', display: loading ? 'none' : 'block' }} />

        {hover && (
          <div
            className="absolute top-2 left-2 rounded-lg px-3 py-2 text-xs pointer-events-none"
            style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(148,163,184,0.2)', color: 'var(--text-primary)' }}
          >
            <div className="font-semibold mb-1">{hover.date}</div>
            {hover.rows.map(([m, v]) => (
              <div key={m} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colorFor(m) }} />
                <span className="flex-1">{m}</span>
                <span className="font-mono">${v.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 mt-1 pt-1 font-semibold" style={{ borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <span>Total</span>
              <span className="font-mono">${hover.total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
        Перетащи / прокрути на графике для выбора диапазона — пироги и график по часам обновятся
      </p>
    </div>
  );
}
