import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, type TooltipItem } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange, type HourlyEntry } from '../lib/api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

type Metric = 'cost' | 'tokens';

const TOKEN_SERIES: { key: keyof HourlyEntry; label: string; color: string }[] = [
  { key: 'cache_read', label: 'Cache read', color: '#D3D2CC' },
  { key: 'cache_write', label: 'Cache write', color: '#999790' },
  { key: 'input_tokens', label: 'Input', color: '#66645F' },
  { key: 'output_tokens', label: 'Output', color: '#111111' },
];

const COST_COLOR = '#111111';
const COST_PEAK = '#BC1010';

function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
const fmtCost = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(value < 10 ? 2 : 0)}`);

const tooltipStyle = {
  backgroundColor: '#F4F4F0',
  borderColor: '#111111',
  borderWidth: 1,
  padding: 10,
  titleColor: '#111111',
  bodyColor: '#111111',
  footerColor: '#66645F',
};

export function HourlyChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getHourly(range), [range?.from, range?.to]);
  const [metric, setMetric] = useState<Metric>('cost');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const hours = useMemo(() => data || [], [data]);

  const totals = useMemo(() => {
    const total = { cost: 0, input_tokens: 0, output_tokens: 0, cache_read: 0, cache_write: 0 };
    for (const hour of hours) {
      total.cost += hour.cost;
      total.input_tokens += hour.input_tokens;
      total.output_tokens += hour.output_tokens;
      total.cache_read += hour.cache_read;
      total.cache_write += hour.cache_write;
    }
    return total;
  }, [hours]);

  const allTokens = totals.input_tokens + totals.output_tokens + totals.cache_read + totals.cache_write;
  const peak = useMemo(() => {
    let best = -1;
    let bestValue = -1;
    for (const hour of hours) {
      const value = metric === 'cost'
        ? hour.cost
        : TOKEN_SERIES.reduce((sum, series) => sum + (hidden.has(series.label) ? 0 : (hour[series.key] as number)), 0);
      if (value > bestValue) {
        bestValue = value;
        best = hour.hour;
      }
    }
    return { hour: best, value: bestValue };
  }, [hours, metric, hidden]);

  const chartData = useMemo(() => {
    if (metric === 'cost') {
      return {
        labels: hours.map(hour => String(hour.hour)),
        datasets: [{
          label: 'Cost',
          data: hours.map(hour => hour.cost),
          backgroundColor: hours.map(hour => hour.hour === peak.hour ? COST_PEAK : COST_COLOR),
          borderRadius: 0,
          maxBarThickness: 30,
        }],
      };
    }
    return {
      labels: hours.map(hour => String(hour.hour)),
      datasets: TOKEN_SERIES.filter(series => !hidden.has(series.label)).map(series => ({
        label: series.label,
        data: hours.map(hour => hour[series.key] as number),
        backgroundColor: series.color,
        borderRadius: 0,
        maxBarThickness: 30,
      })),
    };
  }, [hours, metric, hidden, peak.hour]);

  if (loading || !data) return <div className="min-h-96 border-2 border-[#111111] bg-[#DEDDD7] animate-pulse" aria-label="Loading hourly activity" />;

  const fmtValue = metric === 'cost' ? fmtCost : fmtTokens;

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <div className="grid gap-4 border-b-2 border-[#111111] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Hourly activity</h3>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#66645F]">
            <span className="font-mono text-base font-bold text-[#111111]">{metric === 'cost' ? `$${totals.cost.toFixed(2)}` : `${fmtTokens(allTokens)} tokens`}</span>
            {peak.hour >= 0 && peak.value > 0 && <span>Peak {String(peak.hour).padStart(2, '0')}:00 - {fmtValue(peak.value)}</span>}
          </div>
        </div>
        <div role="group" aria-label="Hourly metric" className="grid grid-cols-2 gap-px border border-[#111111] bg-[#111111]">
          {([['cost', 'Cost'], ['tokens', 'Tokens']] as [Metric, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className="min-h-11 px-4 text-xs font-bold uppercase tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
              style={{ background: metric === key ? '#111111' : '#F4F4F0', color: metric === key ? '#F4F4F0' : '#111111' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {metric === 'tokens' && (
        <div className="mt-4 grid grid-cols-1 gap-px border border-[#111111] bg-[#111111] sm:grid-cols-2 lg:grid-cols-4">
          {TOKEN_SERIES.map(series => {
            const off = hidden.has(series.label);
            const sum = totals[series.key as keyof typeof totals] as number;
            return (
              <button
                key={series.label}
                type="button"
                onClick={() => setHidden(previous => {
                  const next = new Set(previous);
                  if (next.has(series.label)) next.delete(series.label); else next.add(series.label);
                  return next;
                })}
                aria-pressed={!off}
                className="flex min-h-11 items-center gap-2 bg-[#F4F4F0] px-3 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
                style={{ opacity: off ? 0.42 : 1 }}
              >
                <span className="h-2.5 w-2.5 shrink-0 border border-[#111111]" style={{ background: series.color }} />
                <span className="min-w-0 flex-1 truncate font-bold uppercase tracking-[0.06em] text-[#111111]">{series.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-[#66645F]">{fmtTokens(sum)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 h-64 sm:h-72">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipStyle,
                callbacks: {
                  title: (items: TooltipItem<'bar'>[]) => `${String(hours[items[0].dataIndex].hour).padStart(2, '0')}:00`,
                  label: (context: TooltipItem<'bar'>) => {
                    const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;
                    if (value <= 0) return '';
                    return metric === 'cost' ? ` $${value.toFixed(2)}` : ` ${context.dataset.label}: ${fmtTokens(value)}`;
                  },
                  footer: (items: TooltipItem<'bar'>[]) => {
                    const hour = hours[items[0].dataIndex];
                    if (metric === 'cost') return `${hour.sessions} active sessions`;
                    const sum = items.reduce((total, item) => total + (typeof item.parsed.y === 'number' ? item.parsed.y : 0), 0);
                    return `Total: ${fmtTokens(sum)} - $${hour.cost.toFixed(2)}`;
                  },
                },
              },
            },
            scales: {
              x: { stacked: true, ticks: { color: '#66645F', font: { size: 10, family: 'JetBrains Mono' } }, grid: { display: false }, border: { color: '#111111' } },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { color: '#66645F', font: { size: 10, family: 'JetBrains Mono' }, callback: value => fmtValue(Number(value)) },
                grid: { color: '#D3D2CC' },
                border: { color: '#111111' },
              },
            },
          }}
        />
      </div>

      <p className="mt-4 border-t border-[#DEDDD7] pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#66645F]">
        Local message timestamp. Range follows the history chart.
      </p>
    </section>
  );
}
