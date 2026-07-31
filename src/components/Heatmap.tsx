import { useApi } from '../hooks/useApi';
import { api, type DateRange, type HeatmapEntry } from '../lib/api';
import { buildPeakHoursAnalytics, formatHour } from '../lib/peak-hours';

function getLevel(cost: number, max: number): number {
  if (cost === 0) return 0;
  const ratio = cost / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.4) return 2;
  if (ratio < 0.7) return 3;
  return 4;
}

const LEVEL_COLORS = ['#F4F4F0', '#DEDDD7', '#AAA8A0', '#66645F', '#BC1010'];

export function Heatmap({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getHeatmap(range), [range?.from, range?.to]);
  if (loading || !data) return <div className="min-h-44 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading peak hours" />;

  const allDates = [...new Set(data.map(entry => entry.date))].sort();
  const dates = range?.from || range?.to ? allDates : allDates.slice(-14);
  const visibleDates = new Set(dates);
  const visibleData = data.filter(entry => visibleDates.has(entry.date));
  const maxCost = Math.max(...visibleData.map(entry => entry.cost), 0.01);
  const cellMap: Record<string, HeatmapEntry> = {};
  for (const entry of visibleData) cellMap[`${entry.date}|${entry.hour}`] = entry;
  const analytics = buildPeakHoursAnalytics(visibleData, range);

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
      <div className="mt-4 grid gap-4 xl:grid-cols-[max-content_minmax(18rem,1fr)] xl:items-stretch">
        <div className="min-w-0 overflow-x-auto pb-2">
          <div
            className="flex w-max gap-px bg-[#111111] p-px"
            role="img"
            aria-label={`Peak hours heatmap for ${dates.length} active days. Highest cost cells are red; lower activity is gray.`}
          >
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

        <aside className="flex min-w-0 flex-col border border-[#111111] bg-[#EBEAE5] p-4" aria-label="Work pattern analytics">
          <div className="border-b border-[#111111] pb-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#BC1010]">Selected range</p>
            <h4 className="mt-1 text-xl font-black uppercase tracking-[-0.05em] text-[#111111]">Routine vs spikes</h4>
            <p className="mt-1 text-xs leading-5 text-[#66645F]">Separates repeatable working hours from one-off expensive peaks.</p>
          </div>

          {analytics.activeDays === 0 ? (
            <div className="grid flex-1 place-items-center py-8 font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">No activity in range</div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-px bg-[#111111]">
                {[
                  { label: 'Active days', value: analytics.activeDays.toLocaleString('en-US') },
                  { label: 'Most consistent', value: formatHour(analytics.mostConsistentHour) },
                  { label: 'Peak repeats', value: `${analytics.peakRepeatabilityPct.toFixed(0)}%` },
                  { label: 'Single-cell share', value: `${analytics.spikeDependencyPct.toFixed(1)}%` },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#F4F4F0] px-3 py-3">
                    <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[#66645F]">{stat.label}</dt>
                    <dd className="mt-1 font-mono text-base font-bold tabular-nums text-[#111111]">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 min-h-0 flex-1">
                <div className="mb-2 flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[#66645F]">
                  <span>Recurring hours</span>
                  <span>Days / cost share</span>
                </div>
                <ol className="border-t border-[#111111]">
                  {analytics.recurringHours.map(hour => (
                    <li key={hour.hour} className="border-b border-[#B8B7B1] py-2.5">
                      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2">
                        <strong className="font-mono text-[11px] tabular-nums text-[#111111]">{formatHour(hour.hour)}</strong>
                        <div className="h-2 border border-[#111111] bg-[#F4F4F0]" aria-hidden="true">
                          <div className="h-full bg-[#111111]" style={{ width: `${hour.recurrencePct}%` }} />
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-[#66645F]">
                          {hour.activeDays}/{analytics.activeDays} · {hour.costSharePct.toFixed(1)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
