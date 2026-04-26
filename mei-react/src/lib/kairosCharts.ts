// Shared chart configs — theme-aware via getOptions(dark)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData    = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyOptions = any;

export interface KairosChartEntry {
  type: 'line' | 'bar';
  label: string;
  data: AnyData;
  getOptions: (dark: boolean) => AnyOptions;
}

const C = {
  blue:      '#3B82F6', blueFill:  'rgba(59,130,246,0.15)',
  red:       '#EF4444', redFill:   'rgba(239,68,68,0.15)',
  amber:     '#F59E0B', amberFill: 'rgba(245,158,11,0.15)',
  green:     '#22C55E', greenFill: 'rgba(34,197,94,0.15)',
};

const FONT = "'IBM Plex Sans', system-ui, sans-serif";

function palette(dark: boolean) {
  return {
    text:    dark ? 'rgba(255,255,255,0.70)' : '#374151',
    textDim: dark ? 'rgba(255,255,255,0.40)' : '#6B7280',
    grid:    dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
  };
}

function lineOpts(yLabel: string, dark: boolean): AnyOptions {
  const p = palette(dark);
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: p.text, font: { size: 11, family: FONT }, boxWidth: 12, padding: 8 },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        grid: { color: p.grid },
        ticks: { color: p.text, font: { size: 11, family: FONT } },
      },
      y: {
        grid: { color: p.grid },
        ticks: { color: p.text, font: { size: 11, family: FONT } },
        title: { display: !!yLabel, text: yLabel, color: p.textDim, font: { size: 11, family: FONT } },
      },
    },
  };
}

function barOpts(yLabel: string, dark: boolean): AnyOptions {
  const p = palette(dark);
  return {
    ...lineOpts(yLabel, dark),
    plugins: {
      legend: {
        display: true,
        labels: { color: p.text, font: { size: 11, family: FONT }, boxWidth: 12, padding: 8 },
      },
      tooltip: { mode: 'index', intersect: false },
    },
  };
}

export const KAIROS_CHARTS: Record<string, KairosChartEntry> = {
  oee: {
    type: 'line',
    label: 'OEE % — Batch vs Golden Batch',
    data: {
      labels: ['Batch 011','Batch 012','Batch 013','Batch 014','Batch 015','Batch 016'],
      datasets: [
        { label: 'Actual OEE %',         data: [91.2,88.4,85.1,81.6,78.4,76.1], borderColor: C.red,   backgroundColor: C.redFill,    fill: true,  tension: 0.3, pointRadius: 3, borderWidth: 2 },
        { label: 'Golden Batch Baseline', data: [92.4,92.1,93.0,92.8,92.4,92.6], borderColor: C.green, backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 0, borderDash: [5,3], borderWidth: 1.5 },
        { label: 'World-class (85%)',     data: [85,85,85,85,85,85],             borderColor: C.amber, backgroundColor: 'transparent', fill: false, tension: 0,   pointRadius: 0, borderDash: [2,5], borderWidth: 1.5 },
      ],
    },
    getOptions: (dark) => {
      const p = palette(dark);
      return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: p.text, font: { size: 11, family: FONT }, boxWidth: 12, padding: 8 } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { color: p.grid }, ticks: { color: p.text, font: { size: 11, family: FONT }, maxRotation: 0 } },
          y: { min: 60, max: 100, grid: { color: p.grid }, ticks: { color: p.text, font: { size: 11, family: FONT }, callback: (v: number) => v + '%', stepSize: 10 } },
        },
      };
    },
  },
  tension: {
    type: 'line',
    label: 'Film Tension Drift — FT-1101',
    data: {
      labels: ['08:00','08:10','08:20','08:30','08:40','08:50','09:00'],
      datasets: [
        { label: 'Film Tension (N)', data: [42,41,39,37,35,34,34], borderColor: C.amber, backgroundColor: C.amberFill, fill: true,  tension: 0.3, pointRadius: 3 },
        { label: 'Target (42 N)',    data: [42,42,42,42,42,42,42], borderColor: C.green, borderDash: [4,3], pointRadius: 0, borderWidth: 1.5, backgroundColor: 'transparent' },
      ],
    },
    getOptions: (dark) => lineOpts('N', dark),
  },
  planned: {
    type: 'bar',
    label: 'Planned vs Actual Output',
    data: {
      labels: ['08:00','08:30','09:00','09:30','10:00'],
      datasets: [
        { label: 'Planned', data: [600,1200,1800,2400,3000], backgroundColor: 'rgba(59,130,246,0.5)',  borderRadius: 3 },
        { label: 'Actual',  data: [598,1150,1120,null,null],  backgroundColor: 'rgba(239,68,68,0.55)', borderRadius: 3 },
      ],
    },
    getOptions: (dark) => barOpts('Units', dark),
  },
  reject: {
    type: 'line',
    label: 'Reject Rate % — VI-1101',
    data: {
      labels: ['08:00','08:15','08:30','08:45','09:00'],
      datasets: [
        { label: 'Reject Rate %', data: [1.4,1.8,2.9,3.8,4.2], borderColor: C.red,   backgroundColor: C.redFill, fill: true,  tension: 0.3, pointRadius: 3 },
        { label: 'Limit (1.5%)',  data: [1.5,1.5,1.5,1.5,1.5], borderColor: C.amber, borderDash: [4,3], pointRadius: 0, borderWidth: 1.5, backgroundColor: 'transparent' },
      ],
    },
    getOptions: (dark) => lineOpts('%', dark),
  },
  golden: {
    type: 'bar',
    label: 'Current vs Golden Batch',
    data: {
      labels: ['OEE %','Speed (bpm ÷ 3)','Output (÷ 50)'],
      datasets: [
        { label: 'Golden PH-2025-088',  data: [92.4,80,96],     backgroundColor: 'rgba(34,197,94,0.5)',  borderRadius: 3 },
        { label: 'Current PH-2026-018', data: [78.4,72.7,22.4], backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 3 },
      ],
    },
    getOptions: (dark) => barOpts('Value', dark),
  },
  speed: {
    type: 'line',
    label: 'Blister Speed Drift — BM-1101',
    data: {
      labels: ['08:00','08:10','08:20','08:30','08:40','08:50','09:00'],
      datasets: [
        { label: 'Blister Speed (bpm)', data: [240,240,235,224,219,218,218], borderColor: C.amber, backgroundColor: C.amberFill, fill: true,  tension: 0.3, pointRadius: 3 },
        { label: 'Setpoint (240 bpm)',  data: [240,240,240,240,240,240,240], borderColor: C.blue,  borderDash: [4,3], pointRadius: 0, borderWidth: 1.5, backgroundColor: 'transparent' },
      ],
    },
    getOptions: (dark) => lineOpts('bpm', dark),
  },
};
