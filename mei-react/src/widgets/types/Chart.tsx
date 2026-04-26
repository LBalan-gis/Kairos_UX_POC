import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Dataset {
  label?: string;
  data: number[];
  color?: string;
  fill?: boolean;
}

interface WidgetChartProps {
  chartType?: 'line' | 'bar' | 'doughnut';
  label?: string;
  height?: number;
  datasets?: Dataset[];
  labels?: string[];
  dark?: boolean;
}

export function WidgetChart({ chartType = 'line', label, height = 140, datasets = [], labels = [], dark = true }: WidgetChartProps) {
  const Comp = chartType === 'bar' ? Bar : chartType === 'doughnut' ? Doughnut : Line;

  const labelColor   = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const gridColor    = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickColor    = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const tooltipBg    = dark ? 'rgba(4,8,18,0.92)'      : 'rgba(255,255,255,0.97)';
  const tooltipTitle = dark ? 'rgba(255,255,255,0.50)'  : 'rgba(0,0,0,0.50)';
  const tooltipBody  = dark ? '#fff'                    : '#111827';
  const tooltipBorder = dark ? 'rgba(42,241,229,0.20)' : 'rgba(0,0,0,0.10)';

  const data = {
    labels,
    datasets: datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color ?? '#2AF1E5',
      backgroundColor: ds.fill ? (ds.color ? `${ds.color}20` : 'rgba(42,241,229,0.1)') : ds.color,
      borderWidth: 2,
      fill: ds.fill,
      tension: 0.3,
      pointRadius: 0,
      pointHitRadius: 10,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title:  { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor:  tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        cornerRadius: 4,
      },
    },
    scales: chartType === 'doughnut' ? undefined : {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 9 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 9 } } },
    },
  };

  return (
    <div style={{ padding: 16 }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: labelColor, marginBottom: 12, textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      <div style={{ height }}>
        <Comp data={data} options={options as Parameters<typeof Comp>[0]['options']} />
      </div>
    </div>
  );
}
