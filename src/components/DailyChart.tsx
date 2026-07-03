import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart, HistogramSeries, ColorType,
  type IChartApi, type Time,
} from 'lightweight-charts';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const SOURCE_COLORS: Record<string, string> = {
  'Claude Code': '#60a5fa',
  'Claude Desktop': '#a78bfa',
  'OpenClaw': '#22d3ee',
  'Clawdbot': '#22d3ee',
  'Cursor': '#34d399',
  'Windsurf': '#fbbf24',
  'Cline': '#f87171',
  'Roo Code': '#fb923c',
  'Aider': '#e879f9',
  'Continue': '#94a3b8',
};

const colorFor = (source: string) => SOURCE_COLORS[source] || '#94a3b8';

export function DailyChart() {
  // days=0 → full history from the earliest session.
  const { data, loading } = useApi(() => api.getDailyChart(0), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hover, setHover] = useState<{ date: string; rows: [string, number][]; total: number } | null>(null);

  // Sources ordered by total spend (largest sits at the bottom of the stack).
  const sources = useMemo(() => {
    if (!data) return [] as string[];
    const totals: Record<string, number> = {};
    for (const d of data) {
      for (const [src, cost] of Object.entries(d.sources)) totals[src] = (totals[src] || 0) + cost;
    }
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  }, [data]);

  // Per-day source breakdown for the tooltip.
  const byDate = useMemo(() => {
    const m: Record<string, { rows: [string, number][]; total: number }> = {};
    if (!data) return m;
    for (const d of data) {
      const rows = Object.entries(d.sources)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]) as [string, number][];
      m[d.date] = { rows, total: rows.reduce((s, [, v]) => s + v, 0) };
    }
    return m;
  }, [data]);

  useEffect(() => {
    if (!data || !containerRef.current || sources.length === 0) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, sans-serif',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.06)' },
        horzLines: { color: 'rgba(148,163,184,0.1)' },
      },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.15)' },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        rightOffset: 2,
        minBarSpacing: 0.5,
      },
      crosshair: {
        vertLine: { color: 'rgba(148,163,184,0.4)', labelBackgroundColor: '#334155' },
        horzLine: { color: 'rgba(148,163,184,0.4)', labelBackgroundColor: '#334155' },
      },
      // Touch + mouse pan/zoom (all enabled by default; kept explicit).
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      autoSize: true,
      localization: { priceFormatter: (p: number) => `$${p.toFixed(2)}` },
    });
    chartRef.current = chart;

    // Stacked look: one histogram series per source, each drawn from 0 up to
    // the CUMULATIVE total through its position in the stack. The largest
    // cumulative (top of the stack) must be added FIRST so it renders behind;
    // smaller cumulatives are added later and paint over the lower portion,
    // leaving each source visible only in its own band. sources[0] has the
    // biggest spend and sits at the bottom of the stack.
    for (let p = sources.length - 1; p >= 0; p--) {
      const s = chart.addSeries(HistogramSeries, {
        color: colorFor(sources[p]),
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        priceLineVisible: false,
        lastValueVisible: false,
        base: 0,
      });
      const points = data.map((d) => {
        let cum = 0;
        for (let q = 0; q <= p; q++) cum += d.sources[sources[q]] || 0;
        return { time: d.date as Time, value: cum };
      });
      s.setData(points);
    }

    // Open on the most recent ~45 days; user can drag/scroll into the past.
    const n = data.length;
    if (n > 45) chart.timeScale().setVisibleLogicalRange({ from: n - 45, to: n - 1 });
    else chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      const t = param.time as string | undefined;
      if (!t || !byDate[t]) { setHover(null); return; }
      setHover({ date: t, rows: byDate[t].rows, total: byDate[t].total });
    });

    return () => { chart.remove(); chartRef.current = null; };
  }, [data, sources, byDate]);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Spend by Source</h3>
        <div className="flex flex-wrap gap-3">
          {sources.map((src) => (
            <span key={src} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colorFor(src) }} />
              {src}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        {loading && <div className="h-72 animate-pulse rounded-lg" style={{ background: 'rgba(148,163,184,0.08)' }} />}
        <div ref={containerRef} style={{ height: 288, width: '100%', display: loading ? 'none' : 'block' }} />

        {hover && (
          <div
            className="absolute top-2 left-2 rounded-lg px-3 py-2 text-xs pointer-events-none"
            style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(148,163,184,0.2)', color: 'var(--text-primary)' }}
          >
            <div className="font-semibold mb-1">{hover.date}</div>
            {hover.rows.map(([src, v]) => (
              <div key={src} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colorFor(src) }} />
                <span className="flex-1">{src}</span>
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
        Drag to pan · scroll / pinch to zoom · full history
      </p>
    </div>
  );
}
