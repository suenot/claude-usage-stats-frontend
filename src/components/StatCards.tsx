import type { Summary } from '../lib/api';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${color}` }}>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="font-mono text-2xl font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

export function StatCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard label="Today" value={`$${summary.today_cost.toFixed(2)}`} color="var(--accent-cyan)" />
      <StatCard label="This Week" value={`$${summary.week_cost.toFixed(2)}`} color="var(--accent-blue)" />
      <StatCard label="This Month" value={`$${summary.month_cost.toFixed(2)}`} color="var(--accent-purple)" />
      <StatCard label="All Time" value={`$${summary.totals.grand_total.toFixed(2)}`} color="var(--accent-yellow)" />
      <StatCard label="Sessions" value={String(summary.session_counts.total)} color="var(--accent-green)" />
    </div>
  );
}
