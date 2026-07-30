import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
  type TooltipItem,
} from 'chart.js';
import { useApi } from '../hooks/useApi';
import {
  api,
  type DateRange,
  type HistoryBucket,
  type HistoryGroupBy,
  type HistoryTimeframe,
} from '../lib/api';
import { colorForModel, colorForSource } from '../lib/model-colors';
import {
  defaultChartViewport,
  normalizeChartViewport,
  type ChartViewport,
} from '../lib/chart-viewport';
import { ActivityNavigator } from './ActivityNavigator';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

function fade(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function fmtLong(timestamp: string, timeframe: HistoryTimeframe): string {
  const date = timestamp.slice(0, 10);
  const [y, m, d] = date.split('-');
  const day = `${d}.${m}.${y}, ${WEEKDAYS[new Date(+y, +m - 1, +d).getDay()]}`;
  return timeframe === '1h' ? `${day}, ${timestamp.slice(11, 13)}:00` : day;
}

function fmtShort(timestamp: string, timeframe: HistoryTimeframe): string {
  const date = `${timestamp.slice(8, 10)}.${timestamp.slice(5, 7)}`;
  return timeframe === '1h' ? `${date} ${timestamp.slice(11, 13)}:00` : date;
}

const money = (value: number) => (
  value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(value < 10 ? 2 : 0)}`
);

type Metric = 'usd' | 'tokens';

interface ChartBucket extends HistoryBucket {
  totalUsd: number;
  totalTokens: number;
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

function Segmented<T extends string,>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid min-h-11 grid-flow-col auto-cols-fr gap-px border border-[#111111] bg-[#111111]"
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="min-w-0 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
          style={{
            background: value === option.value ? '#111111' : '#F4F4F0',
            color: value === option.value ? '#F4F4F0' : '#111111',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const METRIC_OPTIONS = [
  { value: 'usd', label: 'USD' },
  { value: 'tokens', label: 'Tokens' },
] as const;

const GROUP_OPTIONS = [
  { value: 'harness', label: 'Harness' },
  { value: 'model', label: 'Model' },
] as const;

const TIMEFRAME_OPTIONS = [
  { value: '1d', label: '1d' },
  { value: '1h', label: '1h' },
] as const;

function metricTotal(bucket: ChartBucket, metric: Metric): number {
  return metric === 'usd' ? bucket.totalUsd : bucket.totalTokens;
}

function formatTotal(value: number, metric: Metric): string {
  return metric === 'usd' ? `$${value.toFixed(2)}` : `${(value / 1_000_000).toFixed(1)}M`;
}

function isActiveBucket(bucket: ChartBucket): boolean {
  return bucket.totalUsd > 0 || bucket.totalTokens > 0;
}

// Keep isolated empty buckets as real gaps, but remove empty heads/tails and
// runs of three or more so long inactive periods do not flatten the chart.
function compact(entries: HistoryBucket[]): ChartBucket[] {
  const buckets = entries.map(entry => {
    const totals = Object.values(entry.values).reduce(
      (sum, value) => ({
        usd: sum.usd + value.usd,
        tokens: sum.tokens + value.tokens,
      }),
      { usd: 0, tokens: 0 },
    );
    return { ...entry, totalUsd: totals.usd, totalTokens: totals.tokens };
  });
  const empty = (bucket: ChartBucket) => !isActiveBucket(bucket);

  let head = 0;
  while (head < buckets.length && empty(buckets[head])) head++;
  let tail = buckets.length - 1;
  while (tail >= 0 && empty(buckets[tail])) tail--;

  const out: ChartBucket[] = [];
  for (let i = head; i <= tail; i++) {
    if (!empty(buckets[i])) {
      out.push(buckets[i]);
      continue;
    }
    let start = i;
    while (start > head && empty(buckets[start - 1])) start--;
    let end = i;
    while (end < tail && empty(buckets[end + 1])) end++;
    if (end - start + 1 < 3) out.push(buckets[i]);
  }
  return out;
}

export function DailyChart({ range, onRangeChange }: { range?: DateRange; onRangeChange?: (range: DateRange) => void }) {
  const [metric, setMetric] = useState<Metric>('usd');
  const [groupBy, setGroupBy] = useState<HistoryGroupBy>('harness');
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>('1d');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { data, loading } = useApi(
    () => api.getHistory(timeframe, groupBy, 0),
    [timeframe, groupBy],
  );

  const chartRef = useRef<ChartJS<'bar', number[], string> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ left: number; right: number; count: number; total: number } | null>(null);

  const buckets = useMemo(
    () => data && data.timeframe === timeframe && data.groupBy === groupBy ? compact(data.buckets) : [],
    [data, timeframe, groupBy],
  );
  const [viewport, setViewport] = useState<ChartViewport>({ start: 0, end: 0 });
  const preferredViewportSize = timeframe === '1d' ? 30 : 168;
  const effectiveViewport = useMemo(() => (
    viewport.end > 0
      ? normalizeChartViewport(viewport, buckets.length)
      : defaultChartViewport(buckets.length, preferredViewportSize)
  ), [viewport, buckets.length, preferredViewportSize]);
  const visibleBuckets = useMemo(
    () => buckets.slice(effectiveViewport.start, effectiveViewport.end),
    [buckets, effectiveViewport],
  );

  useEffect(() => {
    setViewport(defaultChartViewport(buckets.length, preferredViewportSize));
  }, [buckets.length, timeframe, preferredViewportSize]);

  const series = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const bucket of buckets) {
      for (const [name, value] of Object.entries(bucket.values)) {
        totals[name] = (totals[name] || 0) + value[metric];
      }
    }
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  }, [buckets, metric]);

  const rangeLength = timeframe === '1d' ? 10 : 13;
  const from = range?.from?.slice(0, rangeLength);
  const to = range?.to?.slice(0, rangeLength);
  const hasRange = !!(from || to);
  const inRange = (timestamp: string) => {
    const key = timestamp.slice(0, rangeLength);
    return (!from || key >= from) && (!to || key <= to);
  };

  const selected = useMemo(() => buckets.filter(bucket => {
    const key = bucket.timestamp.slice(0, rangeLength);
    return (!from || key >= from) && (!to || key <= to);
  }), [buckets, from, to, rangeLength]);

  const selectedTotal = selected.reduce((sum, bucket) => sum + metricTotal(bucket, metric), 0);
  const activeCount = selected.filter(isActiveBucket).length;
  const selectedBySeries = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const bucket of selected) {
      for (const [name, value] of Object.entries(bucket.values)) {
        totals[name] = (totals[name] || 0) + value[metric];
      }
    }
    return totals;
  }, [selected, metric]);

  const geometry = () => {
    const chart = chartRef.current;
    if (!chart || visibleBuckets.length === 0) return null;
    const { left, right } = chart.chartArea;
    return { left, right, step: (right - left) / visibleBuckets.length };
  };

  const indexAt = (x: number) => {
    const geometryValue = geometry();
    if (!geometryValue) return 0;
    return Math.max(
      0,
      Math.min(visibleBuckets.length - 1, Math.floor((x - geometryValue.left) / geometryValue.step)),
    );
  };

  const bandFor = (startIndex: number, endIndex: number) => {
    const geometryValue = geometry()!;
    return {
      left: geometryValue.left + Math.min(startIndex, endIndex) * geometryValue.step,
      right: geometryValue.left + (Math.max(startIndex, endIndex) + 1) * geometryValue.step,
    };
  };

  const localX = (event: React.PointerEvent) => {
    const box = wrapRef.current!.getBoundingClientRect();
    return event.clientX - box.left;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    const geometryValue = geometry();
    if (!geometryValue) return;
    const x = localX(event);
    if (x < geometryValue.left || x > geometryValue.right) return;
    dragRef.current = { startX: x, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const x = localX(event);
    if (Math.abs(x - current.startX) > 3) current.moved = true;
    if (!current.moved) return;

    const startIndex = indexAt(current.startX);
    const endIndex = indexAt(x);
    const band = bandFor(startIndex, endIndex);
    const slice = visibleBuckets.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    setDrag({
      ...band,
      count: slice.filter(isActiveBucket).length,
      total: slice.reduce((sum, bucket) => sum + metricTotal(bucket, metric), 0),
    });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;
    if (!current.moved) {
      if (hasRange) onRangeChange?.({});
      return;
    }

    const startIndex = indexAt(current.startX);
    const endIndex = indexAt(localX(event));
    const first = visibleBuckets[Math.min(startIndex, endIndex)].timestamp;
    const last = visibleBuckets[Math.max(startIndex, endIndex)].timestamp;
    if (timeframe === '1d') {
      onRangeChange?.({ from: `${first}T00:00`, to: `${last}T23:59` });
    } else {
      onRangeChange?.({ from: first, to: `${last.slice(0, 13)}:59` });
    }
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setDrag(null);
  };

  const chartData = useMemo(() => ({
    labels: visibleBuckets.map(bucket => fmtShort(bucket.timestamp, timeframe)),
    datasets: series.filter(name => !hidden.has(name)).map(name => ({
      label: name,
      data: visibleBuckets.map(bucket => {
        const value = bucket.values[name]?.[metric] || 0;
        return metric === 'tokens' ? value / 1_000_000 : value;
      }),
      backgroundColor: visibleBuckets.map(bucket => {
        const color = groupBy === 'model' ? colorForModel(name) : colorForSource(name);
        return hasRange && !inRange(bucket.timestamp) ? fade(color, 0.16) : color;
      }),
      borderRadius: 0,
      maxBarThickness: 34,
      yAxisID: 'value',
    })),
  }), [visibleBuckets, series, hidden, metric, groupBy, timeframe, from, to, hasRange]);

  const navigatorBuckets = useMemo(() => buckets.map(bucket => ({
    timestamp: bucket.timestamp,
    total: metricTotal(bucket, metric),
  })), [buckets, metric]);

  const empty = !loading && buckets.length === 0;
  const periodLabel = timeframe === '1d' ? 'активн. дн.' : 'активн. ч.';
  const averageLabel = timeframe === '1d' ? 'активн. день' : 'активн. час';
  const rangeLabel = (value: string | undefined) => {
    if (!value) return '…';
    return timeframe === '1h' ? `${value.replace('T', ' ')}:00` : value;
  };

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <div className="grid gap-4 border-b-2 border-[#111111] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-[-0.07em] text-[#111111] sm:text-4xl">Activity ledger</h3>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#66645F]">
            <span className="font-mono text-lg font-bold text-[#111111]">
              {formatTotal(selectedTotal, metric)}
            </span>
            <span>{activeCount} {periodLabel}</span>
            {activeCount > 0 && (
              <span>{formatTotal(selectedTotal / activeCount, metric)} / {averageLabel}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {hasRange && (
            <span
              className="min-h-11 border border-[#111111] bg-[#DEDDD7] px-3 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#111111]"
            >
              {rangeLabel(from)} &gt; {rangeLabel(to)}
            </span>
          )}
          {hasRange && (
            <button
              type="button"
              onClick={() => onRangeChange?.({})}
              className="min-h-11 border border-[#111111] bg-[#F4F4F0] px-3 text-xs font-bold uppercase tracking-[0.08em] text-[#111111] transition-colors hover:bg-[#BC1010] hover:text-[#F4F4F0] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented options={METRIC_OPTIONS} value={metric} onChange={setMetric} ariaLabel="Metric" />
        <Segmented
          options={GROUP_OPTIONS}
          value={groupBy}
          ariaLabel="Grouping"
          onChange={value => {
            setGroupBy(value);
            setHidden(new Set());
          }}
        />
        <Segmented
          options={TIMEFRAME_OPTIONS}
          value={timeframe}
          onChange={setTimeframe}
          ariaLabel="Timeframe"
        />

        {series.map(name => {
          const off = hidden.has(name);
          const color = groupBy === 'model' ? colorForModel(name) : colorForSource(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden(previous => {
                const next = new Set(previous);
                if (next.has(name)) next.delete(name);
                else next.add(name);
                return next;
              })}
              className="flex min-h-11 max-w-full min-w-0 items-center gap-1.5 border border-[#111111] bg-[#F4F4F0] px-2 text-xs transition-opacity focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
              style={{
                opacity: off ? 0.4 : 1,
              }}
              title={`${off ? 'Показать' : 'Скрыть'} ${name}`}
              aria-label={`${off ? 'Показать' : 'Скрыть'} ${name}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 border border-[#111111]"
                style={{ background: off ? '#DEDDD7' : color }}
              />
              <span className="min-w-0 break-words text-left font-bold uppercase tracking-[0.06em] text-[#111111]" style={{ textDecoration: off ? 'line-through' : 'none' }}>{name}</span>
              <span className="shrink-0 font-mono text-[#66645F]">
                {metric === 'usd'
                  ? money(selectedBySeries[name] || 0)
                  : `${((selectedBySeries[name] || 0) / 1_000_000).toFixed(1)}M`}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <div className="mt-4 h-80 border border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading activity history" />}
      {empty && (
        <div className="mt-4 flex h-80 items-center justify-center border border-[#111111] font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">
          No data
        </div>
      )}

      {!loading && !empty && (
        <div
          ref={wrapRef}
          className="relative mt-4 select-none border border-[#111111] bg-[#F4F4F0]"
          style={{ height: 320, cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
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
                  backgroundColor: '#F4F4F0',
                  borderColor: '#111111',
                  borderWidth: 1,
                  padding: 10,
                  titleColor: '#111111',
                  bodyColor: '#111111',
                  footerColor: '#66645F',
                  itemSort: (a, b) => (b.parsed.y as number) - (a.parsed.y as number),
                  callbacks: {
                    title: (items: TooltipItem<'bar'>[]) => (
                      fmtLong(visibleBuckets[items[0].dataIndex].timestamp, timeframe)
                    ),
                    label: (context: TooltipItem<'bar'>) => {
                      const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;
                      if (value <= 0) return '';
                      return ` ${context.dataset.label}: ${metric === 'usd' ? `$${value.toFixed(2)}` : `${value.toFixed(2)}M`}`;
                    },
                    footer: (items: TooltipItem<'bar'>[]) => {
                      const total = items.reduce(
                        (sum, item) => sum + (typeof item.parsed.y === 'number' ? item.parsed.y : 0),
                        0,
                      );
                      return `Всего: ${metric === 'usd' ? '$' : ''}${total.toFixed(2)}${metric === 'tokens' ? 'M' : ''}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: {
                    color: '#66645F',
                    font: { size: 10, family: 'JetBrains Mono' },
                    maxRotation: 0,
                    autoSkip: true,
                    autoSkipPadding: 12,
                  },
                  grid: { display: false },
                  border: { color: '#111111' },
                },
                value: {
                  position: 'left',
                  stacked: true,
                  beginAtZero: true,
                  ticks: {
                    color: '#66645F',
                    font: { size: 10, family: 'JetBrains Mono' },
                    callback: value => metric === 'usd' ? money(Number(value)) : `${value}M`,
                  },
                  grid: { color: '#D3D2CC' },
                  border: { color: '#111111' },
                },
              },
            }}
          />

          {drag && (
            <>
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: drag.left,
                  width: Math.max(drag.right - drag.left, 2),
                  background: 'rgba(230,25,25,0.12)',
                  borderLeft: '2px solid #BC1010',
                  borderRight: '2px solid #BC1010',
                }}
              />
              <div
                className="absolute top-1 px-2 py-1 border border-[#111111] bg-[#F4F4F0] text-xs font-mono pointer-events-none whitespace-nowrap"
                style={{
                  left: Math.max(0, (drag.left + drag.right) / 2 - 55),
                  color: '#111111',
                }}
              >
                {drag.count} {timeframe === '1d' ? 'days' : 'hours'} - {formatTotal(drag.total, metric)}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && !empty && (
        <ActivityNavigator
          buckets={navigatorBuckets}
          viewport={effectiveViewport}
          timeframe={timeframe}
          onViewportChange={setViewport}
        />
      )}

      <p className="mt-4 border-t border-[#DEDDD7] pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#66645F]">
        Drag the main chart to filter. Click it to reset. Drag or resize the navigator to change the visible window. Empty {timeframe === '1d' ? 'days' : 'hours'} are compacted.
      </p>
    </section>
  );
}
