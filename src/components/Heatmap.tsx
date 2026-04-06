import { useApi } from '../hooks/useApi';
import { api, type HeatmapEntry } from '../lib/api';

function getLevel(cost: number, max: number): number {
  if (cost === 0) return 0;
  const ratio = cost / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.4) return 2;
  if (ratio < 0.7) return 3;
  return 4;
}

const LEVEL_COLORS = [
  'rgba(30, 41, 59, 0.4)',
  'rgba(34, 211, 238, 0.2)',
  'rgba(96, 165, 250, 0.45)',
  'rgba(251, 191, 36, 0.6)',
  'rgba(244, 63, 94, 0.75)',
];

export function Heatmap() {
  const { data, loading } = useApi(() => api.getHeatmap(), []);
  if (loading || !data) return <div className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  // Build hours heatmap (last 14 days)
  const dates = [...new Set(data.map(d => d.date))].sort().slice(-14);
  const maxCost = Math.max(...data.map(d => d.cost), 0.01);

  const cellMap: Record<string, HeatmapEntry> = {};
  for (const entry of data) {
    cellMap[`${entry.date}|${entry.hour}`] = entry;
  }

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Peak Hours</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5" style={{ minWidth: '600px' }}>
          <div className="flex flex-col gap-0.5 mr-1">
            <div className="h-5" />
            {dates.map(d => (
              <div key={d} className="h-5 text-xs flex items-center" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {d.slice(5)}
              </div>
            ))}
          </div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex flex-col gap-0.5">
              <div className="h-5 text-xs text-center" style={{ color: 'var(--text-secondary)', fontSize: '10px', width: '20px' }}>
                {hour}
              </div>
              {dates.map(date => {
                const entry = cellMap[`${date}|${hour}`];
                const level = entry ? getLevel(entry.cost, maxCost) : 0;
                return (
                  <div
                    key={`${date}-${hour}`}
                    className="rounded-sm"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: LEVEL_COLORS[level],
                    }}
                    title={entry ? `${date} ${hour}:00 — $${entry.cost.toFixed(2)} (${entry.sessions} sessions)` : `${date} ${hour}:00`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
