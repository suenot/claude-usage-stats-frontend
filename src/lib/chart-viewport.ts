export interface ChartViewport {
  start: number;
  end: number;
}

export type ChartViewportDragMode = 'move' | 'start' | 'end';

export const MIN_CHART_VIEWPORT_BUCKETS = 3;

export function normalizeChartViewport(
  viewport: ChartViewport,
  total: number,
  minimum = MIN_CHART_VIEWPORT_BUCKETS,
): ChartViewport {
  if (total <= 0) return { start: 0, end: 0 };

  const minSize = Math.min(Math.max(1, minimum), total);
  const start = Math.max(0, Math.min(Math.floor(viewport.start), total - minSize));
  const end = Math.max(start + minSize, Math.min(Math.ceil(viewport.end), total));

  return end <= total ? { start, end } : { start: total - minSize, end: total };
}

export function defaultChartViewport(total: number, preferredSize: number): ChartViewport {
  const size = Math.min(total, Math.max(MIN_CHART_VIEWPORT_BUCKETS, preferredSize));
  return { start: Math.max(0, total - size), end: total };
}

export function updateChartViewport(
  viewport: ChartViewport,
  mode: ChartViewportDragMode,
  delta: number,
  total: number,
): ChartViewport {
  const current = normalizeChartViewport(viewport, total);
  const size = current.end - current.start;

  if (mode === 'move') {
    const start = Math.max(0, Math.min(current.start + delta, total - size));
    return { start, end: start + size };
  }

  if (mode === 'start') {
    return {
      start: Math.max(0, Math.min(current.start + delta, current.end - MIN_CHART_VIEWPORT_BUCKETS)),
      end: current.end,
    };
  }

  return {
    start: current.start,
    end: Math.min(total, Math.max(current.end + delta, current.start + MIN_CHART_VIEWPORT_BUCKETS)),
  };
}

export function centerChartViewport(
  viewport: ChartViewport,
  center: number,
  total: number,
): ChartViewport {
  const current = normalizeChartViewport(viewport, total);
  const size = current.end - current.start;
  const start = Math.max(0, Math.min(Math.round(center - size / 2), total - size));
  return { start, end: start + size };
}
