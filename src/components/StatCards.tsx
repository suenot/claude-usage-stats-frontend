import type { Summary } from '../lib/api';

function StatCard({ label, value, hint, index }: { label: string; value: string; hint?: string; index: number }) {
  return (
    <article className="min-w-0 bg-[#F4F4F0] px-3 py-4 sm:px-4" title={hint}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#66645F]">{label}</div>
        <span className="font-mono text-[10px] text-[#66645F]">0{index + 1}</span>
      </div>
      <data className="mt-5 block overflow-hidden text-2xl font-black tracking-[-0.07em] text-[#111111] sm:text-3xl" value={value}>
        {value}
      </data>
      {hint && <div className="mt-2 min-h-4 text-[10px] leading-4 text-[#66645F]">{hint}</div>}
    </article>
  );
}

export function StatCards({ summary }: { summary: Summary }) {
  const cards = [
    { label: 'Today', value: `$${summary.today_cost.toFixed(2)}` },
    { label: 'This week', value: `$${summary.week_cost.toFixed(2)}` },
    { label: 'This month', value: `$${summary.month_cost.toFixed(2)}` },
    {
      label: 'Average day',
      value: `$${summary.avg_per_active_day.toFixed(2)}`,
      hint: `Median $${summary.median_per_active_day.toFixed(2)} - ${summary.active_days} days`,
    },
    {
      label: 'Average month',
      value: `$${summary.avg_per_active_month.toFixed(2)}`,
      hint: `Median $${summary.median_per_active_month.toFixed(2)} - ${summary.active_months} months`,
    },
    { label: 'All time', value: `$${summary.totals.grand_total.toFixed(2)}` },
    { label: 'Sessions', value: String(summary.session_counts.total) },
  ];

  return (
    <section aria-label="Usage telemetry" className="border-y-2 border-[#111111] bg-[#111111]">
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-7">
        {cards.map((card, index) => <StatCard key={card.label} {...card} index={index} />)}
      </div>
      <div className="h-1 bg-[#BC1010]" />
    </section>
  );
}
