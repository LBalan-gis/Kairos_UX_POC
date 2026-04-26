import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartOptions, ChartData } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

const THEME = {
  grid:       "rgba(100,116,139,0.12)",
  axis:       "#8A9AB0",
  gold:       "#9B7A2E",
  live:       "#2C5899",
  threshold:  "#6B7280",
  loss:       "#B14A42",
  recovery:   "#587A3E",
  simulation: "#7A5CAD",
  fillBlue:   "rgba(44,88,153,0.07)",
  fillRed:    "rgba(177,74,66,0.08)",
  fillGold:   "rgba(155,122,46,0.07)",
  fillGreen:  "rgba(88,122,62,0.07)",
  fillPurple: "rgba(109,40,217,0.07)"
};

const LABELS = Array.from({ length: 24 }, (_, i) => `t-${(23 - i) * 2}`);

function getBaseOptions(yMin: number, yMax: number, yUnit = ""): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "rgba(60,60,67,0.13)",
        borderWidth: 1,
        titleColor: "#000000",
        bodyColor: "#3C3C43",
        padding: { x: 12, y: 10 },
        cornerRadius: 10,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v === null || v === undefined) return null;
            const formatted = Number.isInteger(v)
              ? v.toLocaleString('en-US')
              : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
            return ` ${ctx.dataset.label || ""} ${formatted}${yUnit}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: THEME.grid },
        ticks: { color: THEME.axis, maxTicksLimit: 5, font: { size: 11, weight: "bold" } },
        border: { color: THEME.grid }
      },
      y: {
        min: yMin, max: yMax,
        grid: { color: THEME.grid },
        ticks: {
          color: THEME.axis, maxTicksLimit: 5, font: { size: 11, weight: "bold" },
          callback: (v) => {
            const n = Number(v);
            const formatted = Number.isInteger(n)
              ? n.toLocaleString('en-US')
              : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
            return yUnit ? `${formatted}${yUnit}` : `${formatted}`;
          }
        },
        border: { color: THEME.grid }
      }
    },
    elements: {
      point: { radius: 0, hitRadius: 8, hoverRadius: 5 },
      line: { tension: 0.32, borderWidth: 2.2 }
    }
  };
}

interface MetricSparklineProps {
  entityId: string;
  simulatedTime: number | null;
}

export function MetricSparkline({ entityId, simulatedTime }: MetricSparklineProps) {
  const chartConfig = useMemo(() => {
    const isSim = simulatedTime !== null && simulatedTime > 0;
    const simPoints = isSim ? Math.max(1, Math.ceil((simulatedTime / 60) * 24)) : 0;

    switch (entityId) {
      case 'batch_golden':
        return {
          data: {
            labels: LABELS,
            datasets: [
              { label: "USL", data: Array(24).fill(5.05), borderColor: "rgba(212,166,58,0.28)", borderWidth: 1.2, borderDash: [3, 3], fill: false, pointRadius: 0 },
              { label: "Golden ref", data: [5.00, 5.00, 5.01, 5.00, 5.00, 5.01, 5.00, 5.00, 5.01, 5.00, 5.00, 5.01, 5.00, 5.00, 5.01, 5.00, 5.00, 5.01, 5.00, 5.00, 5.01, 5.00, 5.00, 5.00], borderColor: THEME.gold, backgroundColor: "rgba(212,166,58,0.10)", borderDash: [6, 4], borderWidth: 2.4, fill: "-1", pointRadius: 0 },
              { label: "LSL", data: Array(24).fill(4.95), borderColor: "rgba(212,166,58,0.28)", borderWidth: 1.2, borderDash: [3, 3], backgroundColor: "rgba(212,166,58,0.07)", fill: "-1", pointRadius: 0 }
            ]
          } as ChartData<'line'>,
          options: getBaseOptions(4.90, 5.10, " ml")
        };
      case 'batch_current':
        return {
          data: {
            labels: LABELS,
            datasets: [
              { label: "Golden ref", data: Array(24).fill(5.00), borderColor: THEME.gold, backgroundColor: "rgba(0,0,0,0)", borderDash: [6, 4], borderWidth: 2.2, fill: false, pointRadius: 0, order: 1 },
              { label: "Fill vol ml", data: [5.00, 5.00, 4.99, 4.99, 4.98, 4.98, 4.97, 4.97, 4.96, 4.95, 4.95, 4.94, 4.93, 4.92, 4.91, 4.90, 4.89, 4.88, 4.87, 4.87, 4.88, 4.87, 4.87, 4.87], borderColor: THEME.live, backgroundColor: THEME.fillBlue, borderWidth: 2.4, fill: "origin", pointRadius: 0 }
            ]
          } as ChartData<'line'>,
          options: getBaseOptions(4.80, 5.12, " ml")
        };
      case 'impact_yield':
        return {
          data: {
            labels: LABELS,
            datasets: [
              { label: "Golden baseline", data: Array(24).fill(0.8), borderColor: THEME.gold, borderDash: [6, 4], borderWidth: 2, fill: false, pointRadius: 0 },
              { label: "Unchanged €K", data: [3, 3.6, 4.5, 5.8, 7.5, 9.8, 12.6, 16.0, 20.1, 24.8, 30.0, 35.4, 40.8, 46.0, 51.2, 56.2, 61.0, 65.5, 69.8, 73.7, 77.3, 80.5, 83.6, 87.0], borderColor: THEME.loss, backgroundColor: THEME.fillRed, borderWidth: 2.4, fill: "origin", pointRadius: 0 },
              { label: "Corrected €K", data: isSim ? [3, 3.2, 3.4, 3.7, 4.0, 4.4, 4.8, 5.3, 5.8, 6.4, 6.9, 7.2, 7.5, 7.7, 7.8, 7.9, 8.0, 8.0, 8.1, 8.1, 8.1, 8.0, 8.0, 8.0].slice(0, simPoints) : [], borderColor: THEME.recovery, backgroundColor: THEME.fillGreen, borderWidth: 2.4, fill: isSim ? "origin" : false, pointRadius: 0 }
            ]
          } as ChartData<'line'>,
          options: getBaseOptions(0, 96, "K")
        };
      case 'film_tension':
        return {
          data: {
            labels: LABELS,
            datasets: [
              { label: "Setpoint 42 N", data: Array(24).fill(42), borderColor: THEME.gold, borderDash: [5, 4], borderWidth: 1.6, fill: false, pointRadius: 0 },
              { label: "Film Tension N", data: [42.0, 42.0, 41.9, 41.8, 41.6, 41.3, 41.0, 40.6, 40.1, 39.5, 38.9, 38.2, 37.5, 36.8, 36.1, 35.4, 34.8, 34.3, 34.0, 33.9, 34.0, 34.1, 34.0, 34.0], borderColor: THEME.loss, backgroundColor: THEME.fillRed, borderWidth: 2.4, fill: "1", pointRadius: 0 }
            ]
          } as ChartData<'line'>,
          options: getBaseOptions(30, 48, " N")
        };
      case 'blister_speed':
        return {
          data: {
            labels: LABELS,
            datasets: [
              { label: "Setpoint 240 bpm", data: Array(24).fill(240), borderColor: THEME.gold, borderDash: [5, 4], borderWidth: 1.6, fill: false, pointRadius: 0 },
              { label: "Actual bpm", data: [240.0, 239.8, 239.5, 239.0, 238.3, 237.4, 236.3, 235.0, 233.5, 231.8, 230.0, 228.2, 226.3, 224.4, 222.5, 220.8, 219.2, 218.4, 218.1, 218.0, 218.2, 218.3, 218.1, 218.0], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.12)", borderWidth: 2.4, fill: "1", pointRadius: 0 }
            ]
          } as ChartData<'line'>,
          options: getBaseOptions(210, 248, " bpm")
        };
      case 'hidden_loss':
        return {
          data: {
            labels: LABELS,
            datasets: [
              { label: "Golden reference", data: Array(24).fill(0), borderColor: THEME.gold, borderDash: [6, 4], borderWidth: 2.2, fill: false, pointRadius: 0 },
              { label: "Micro-stops ppm", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 5, 7, 9, 12, 14, 17, 19, 21, 22, 23, 23, 23], borderColor: THEME.loss, backgroundColor: THEME.fillRed, borderWidth: 2.4, fill: "origin", pointRadius: 0 },
              { label: "Threshold", data: Array(24).fill(20), borderColor: THEME.threshold, borderDash: [3, 3], borderWidth: 1.2, fill: false, pointRadius: 0 }
            ]
          } as ChartData<'line'>,
          options: getBaseOptions(0, 30, "")
        };
      default:
        return null;
    }
  }, [entityId, simulatedTime]);

  if (!chartConfig) return null;

  return (
    <div className="chart-wrapper" style={{ height: 110, position: 'relative', marginTop: 16, marginBottom: 8 }}>
      <Line data={chartConfig.data} options={chartConfig.options} />
    </div>
  );
}
