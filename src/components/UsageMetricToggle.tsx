import type { UsageMetric } from '../lib/usage-chart';

export function UsageMetricToggle({
  label,
  metric,
  onChange,
}: {
  label: string;
  metric: UsageMetric;
  onChange: (metric: UsageMetric) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid shrink-0 grid-cols-2 gap-px border border-[#111111] bg-[#111111]">
      {(['usd', 'tokens'] as const).map(option => {
        const selected = metric === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className="min-h-11 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
            style={{
              background: selected ? '#111111' : '#F4F4F0',
              color: selected ? '#F4F4F0' : '#111111',
            }}
          >
            {option === 'usd' ? 'USD' : 'Tokens'}
          </button>
        );
      })}
    </div>
  );
}
