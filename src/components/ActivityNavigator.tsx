import { useRef, useState } from 'react';
import {
  centerChartViewport,
  MIN_CHART_VIEWPORT_BUCKETS,
  updateChartViewport,
  type ChartViewport,
  type ChartViewportDragMode,
} from '../lib/chart-viewport';
import type { HistoryTimeframe } from '../lib/api';

interface NavigatorBucket {
  timestamp: string;
  total: number;
}

interface DragState {
  mode: ChartViewportDragMode;
  pointerX: number;
  viewport: ChartViewport;
}

function shortTimestamp(timestamp: string, timeframe: HistoryTimeframe): string {
  const date = `${timestamp.slice(8, 10)}.${timestamp.slice(5, 7)}`;
  return timeframe === '1h' ? `${date} ${timestamp.slice(11, 13)}:00` : date;
}

export function ActivityNavigator({
  buckets,
  viewport,
  timeframe,
  onViewportChange,
}: {
  buckets: NavigatorBucket[];
  viewport: ChartViewport;
  timeframe: HistoryTimeframe;
  onViewportChange: (viewport: ChartViewport) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragMode, setDragMode] = useState<ChartViewportDragMode | null>(null);
  const total = buckets.length;
  const maximum = Math.max(1, ...buckets.map(bucket => bucket.total));
  const left = total > 0 ? viewport.start / total * 100 : 0;
  const width = total > 0 ? (viewport.end - viewport.start) / total * 100 : 100;
  const first = buckets[viewport.start];
  const last = buckets[Math.max(viewport.start, viewport.end - 1)];

  const beginDrag = (mode: ChartViewportDragMode, event: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = { mode, pointerX: event.clientX, viewport };
    setDragMode(mode);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track || total === 0) return;
    const delta = Math.round((event.clientX - drag.pointerX) / track.getBoundingClientRect().width * total);
    onViewportChange(updateChartViewport(drag.viewport, drag.mode, delta, total));
  };

  const finishDrag = () => {
    dragRef.current = null;
    setDragMode(null);
  };

  const jumpTo = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || total === 0 || event.target !== event.currentTarget) return;
    const box = track.getBoundingClientRect();
    const center = (event.clientX - box.left) / box.width * total;
    onViewportChange(centerChartViewport(viewport, center, total));
  };

  const nudge = (mode: ChartViewportDragMode, delta: number) => {
    onViewportChange(updateChartViewport(viewport, mode, delta, total));
  };

  const onNudgeKey = (mode: ChartViewportDragMode, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? Math.max(1, Math.round((viewport.end - viewport.start) / 10)) : 1;
    nudge(mode, event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : event.key === 'Home' ? -total : total);
  };

  if (total < 2) return null;

  return (
    <section className="mt-3 border border-[#111111] bg-[#DEDDD7] px-12 py-2" aria-label="Chart navigator">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#66645F]">
        <span>Navigator / drag window or edges</span>
        {first && last && <span>{shortTimestamp(first.timestamp, timeframe)} &gt; {shortTimestamp(last.timestamp, timeframe)}</span>}
      </div>
      <div
        ref={trackRef}
        className="relative h-16 cursor-pointer touch-none border border-[#111111] bg-[#F4F4F0]"
        onPointerDown={jumpTo}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 flex items-end">
            {buckets.map((bucket, index) => (
              <span
                key={`${bucket.timestamp}-${index}`}
                className="min-w-0 flex-1 bg-[#66645F] opacity-45"
                style={{ height: `${Math.max(2, bucket.total / maximum * 100)}%` }}
              />
            ))}
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-[#BC1010] bg-[#BC1010]/10"
          style={{ left: `${left}%`, width: `${width}%` }}
          aria-hidden="true"
        />
        <button
          type="button"
          role="slider"
          aria-label="Move visible chart range"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, total - (viewport.end - viewport.start))}
          aria-valuenow={viewport.start}
          aria-valuetext={first && last ? `${shortTimestamp(first.timestamp, timeframe)} to ${shortTimestamp(last.timestamp, timeframe)}` : undefined}
          className={`absolute inset-y-0 cursor-grab border-x-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#BC1010] ${dragMode === 'move' ? 'cursor-grabbing' : ''}`}
          style={{ left: `${left}%`, width: `${width}%` }}
          onPointerDown={event => beginDrag('move', event)}
          onKeyDown={event => onNudgeKey('move', event)}
        />
        <button
          type="button"
          role="slider"
          aria-label="Adjust visible range start"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, viewport.end - Math.min(total, MIN_CHART_VIEWPORT_BUCKETS))}
          aria-valuenow={viewport.start}
          aria-valuetext={first ? shortTimestamp(first.timestamp, timeframe) : undefined}
          className="absolute inset-y-0 z-10 w-11 -translate-x-full cursor-ew-resize bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#BC1010]"
          style={{ left: `${left}%` }}
          onPointerDown={event => beginDrag('start', event)}
          onKeyDown={event => onNudgeKey('start', event)}
        >
          <span className="pointer-events-none absolute inset-y-0 right-0 w-3 border-x border-[#111111] bg-[#BC1010]" />
        </button>
        <button
          type="button"
          role="slider"
          aria-label="Adjust visible range end"
          aria-valuemin={Math.min(total, viewport.start + MIN_CHART_VIEWPORT_BUCKETS)}
          aria-valuemax={total}
          aria-valuenow={viewport.end}
          aria-valuetext={last ? shortTimestamp(last.timestamp, timeframe) : undefined}
          className="absolute inset-y-0 z-10 w-11 cursor-ew-resize bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#BC1010]"
          style={{ left: `${left + width}%` }}
          onPointerDown={event => beginDrag('end', event)}
          onKeyDown={event => onNudgeKey('end', event)}
        >
          <span className="pointer-events-none absolute inset-y-0 left-0 w-3 border-x border-[#111111] bg-[#BC1010]" />
        </button>
      </div>
    </section>
  );
}
