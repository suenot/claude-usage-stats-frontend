import type { Summary } from '../lib/api';

function StatCard({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${color}` }} title={hint}>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="font-mono text-2xl font-bold mt-1" style={{ color }}>{value}</div>
      {hint && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{hint}</div>}
    </div>
  );
}

export function StatCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
      <StatCard label="Today" value={`$${summary.today_cost.toFixed(2)}`} color="var(--accent-cyan)" />
      <StatCard label="This Week" value={`$${summary.week_cost.toFixed(2)}`} color="var(--accent-blue)" />
      <StatCard label="This Month" value={`$${summary.month_cost.toFixed(2)}`} color="var(--accent-purple)" />
      <StatCard
        label="Avg / Day"
        value={`$${summary.avg_per_active_day.toFixed(2)}`}
        color="var(--accent-green)"
        hint={`за ${summary.active_days} активных дн.`}
      />
      <StatCard
        label="Avg / Month"
        value={`$${summary.avg_per_active_month.toFixed(2)}`}
        color="var(--accent-orange)"
        hint={`за ${summary.active_months} активных мес.`}
      />
      <StatCard label="All Time" value={`$${summary.totals.grand_total.toFixed(2)}`} color="var(--accent-yellow)" />
      <StatCard label="Sessions" value={String(summary.session_counts.total)} color="var(--accent-red)" />
    </div>
  );
}
