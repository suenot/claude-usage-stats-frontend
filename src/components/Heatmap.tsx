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

const LEVEL_COLORS = ['#F4F4F0', '#DEDDD7', '#AAA8A0', '#66645F', '#BC1010'];

export function Heatmap() {
  const { data, loading } = useApi(() => api.getHeatmap(), []);
  if (loading || !data) return <div className="min-h-44 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading peak hours" />;

  const dates = [...new Set(data.map(entry => entry.date))].sort().slice(-14);
  const maxCost = Math.max(...data.map(entry => entry.cost), 0.01);
  const cellMap: Record<string, HeatmapEntry> = {};
  for (const entry of data) cellMap[`${entry.date}|${entry.hour}`] = entry;

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#111111] pb-3">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Peak hours</h3>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#66645F]">
          <span>Low</span>
          {LEVEL_COLORS.map(color => <span key={color} className="h-3 w-3 border border-[#111111]" style={{ background: color }} />)}
          <span>High</span>
        </div>
      </header>
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex gap-px bg-[#111111] p-px" style={{ minWidth: '600px' }}>
          <div className="mr-1 flex flex-col gap-px bg-[#F4F4F0] pr-1">
            <div className="h-6" />
            {dates.map(date => (
              <div key={date} className="flex h-6 items-center font-mono text-[10px] text-[#66645F]">{date.slice(5)}</div>
            ))}
          </div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex flex-col gap-px">
              <div className="flex h-6 w-6 items-center justify-center bg-[#F4F4F0] font-mono text-[10px] text-[#66645F]">{hour}</div>
              {dates.map(date => {
                const entry = cellMap[`${date}|${hour}`];
                const level = entry ? getLevel(entry.cost, maxCost) : 0;
                return (
                  <div
                    key={`${date}-${hour}`}
                    className="h-6 w-6 border border-[#F4F4F0]"
                    style={{ backgroundColor: LEVEL_COLORS[level] }}
                    title={entry ? `${date} ${hour}:00 - $${entry.cost.toFixed(2)} (${entry.sessions} sessions)` : `${date} ${hour}:00`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
