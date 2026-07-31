import { useState } from 'react';
import type { DateRange, HistoryChartResponse, PublicSnapshotDetails, Summary } from '../lib/api';
import { DailyChart } from './DailyChart';
import { Heatmap } from './Heatmap';
import { PieSection } from './PieSection';
import { StatCards } from './StatCards';

const EMPTY_PUBLIC_HISTORY: HistoryChartResponse = { timeframe: '1d', groupBy: 'harness', buckets: [] };

interface UsageDashboardProps {
  summary: Summary;
  details?: PublicSnapshotDetails;
  ownerHandle?: string;
  visibility?: 'totals' | 'details';
}

export function UsageDashboard({ summary, details, ownerHandle, visibility }: UsageDashboardProps) {
  const [range, setRange] = useState<DateRange>({});
  const isPublic = Boolean(ownerHandle);

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="border-x border-t border-[var(--line-strong)] px-3 py-4 md:px-5 md:py-5">
        {ownerHandle && <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Public usage profile / @{ownerHandle}</p>}
        <h2 className="text-[clamp(2.75rem,9vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">Usage</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line-strong)] pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
          <span>{isPublic ? `Self-reported ${visibility === 'details' ? 'detailed aggregates' : 'totals'} / not provider-verified` : 'Cost, tokens and cache behavior'}</span>
          <span>{summary.generated_at}</span>
        </div>
      </section>

      <StatCards summary={summary} />

      {isPublic && visibility === 'totals' ? (
        <section className="grid min-h-72 place-items-center border-2 border-[var(--line-strong)] px-5 text-center">
          <div className="max-w-lg">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em]">This user shares totals only</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Charts and detailed usage breakdowns remain private.</p>
          </div>
        </section>
      ) : isPublic && !details ? (
        <section className="grid min-h-72 place-items-center border-2 border-[var(--line-strong)] px-5 text-center">
          <div className="max-w-lg">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em]">Detailed snapshot unavailable</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The owner needs to publish a new detailed snapshot.</p>
          </div>
        </section>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <DailyChart
            range={range}
            onRangeChange={isPublic ? undefined : setRange}
            history={isPublic ? details?.history ?? EMPTY_PUBLIC_HISTORY : undefined}
            readOnly={isPublic}
          />
          <PieSection range={range} setRange={setRange} details={details} publishedSnapshot={isPublic} />
          <Heatmap range={isPublic ? undefined : range} entries={isPublic ? details?.heatmap ?? [] : undefined} />
        </div>
      )}
    </div>
  );
}
