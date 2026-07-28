import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, type TooltipItem } from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange } from '../lib/api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const AXIS = '#94a3b8';
const BAR = '#22d3ee';
const BAR_PEAK = '#60a5fa';

export function HourlyChart({ range }: { range?: DateRange }) {
  const { data, loading } = useApi(() => api.getHourly(range), [range?.from, range?.to]);
  if (loading || !data) return <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-card)' }} />;

  const labels = data.map(d => `${d.hour}`);
  const values = data.map(d => d.cost);
  const peak = Math.max(...values, 0.01);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cost by Hour of Day</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        Суммарная стоимость по часам (0-23). Всего за период: ${values.reduce((a, b) => a + b, 0).toFixed(2)}
      </p>
      <Bar
        data={{
          labels,
          datasets: [{
            data: values.map(v => parseFloat(v.toFixed(2))),
            backgroundColor: values.map(v => (v >= peak * 0.66 ? BAR_PEAK : BAR)),
            borderRadius: 3,
            maxBarThickness: 28,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items: TooltipItem<'bar'>[]) => `${items[0].label}:00`,
                label: (ctx: TooltipItem<'bar'>) => {
                  const h = data[ctx.dataIndex];
                  const y = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                  return [`$${y.toFixed(2)}`, `${h.sessions} сессий`];
                },
              },
            },
          },
          scales: {
            x: { ticks: { color: AXIS, font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: AXIS, callback: (v) => `$${v}` }, grid: { color: 'rgba(148,163,184,0.1)' }, beginAtZero: true },
          },
        }}
        style={{ maxHeight: 240 }}
      />
    </div>
  );
}
