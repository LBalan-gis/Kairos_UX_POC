// Shared chart configs used in both KairOSOverlay (chat bubbles) and KPIDashboard (pinned section)

const C = {
  blue: '#3B82F6', blueFill: 'rgba(59,130,246,0.15)',
  red:  '#EF4444', redFill:  'rgba(239,68,68,0.15)',
  amber:'#F59E0B', amberFill:'rgba(245,158,11,0.15)',
  green:'#22C55E', greenFill:'rgba(34,197,94,0.15)',
};

const lineOpts = (yLabel) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: true, labels: { color: 'rgba(255,255,255,0.55)', font: { size: 10 }, boxWidth: 10 } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } } },
    y: {
      grid: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } } },
      ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } },
      title: { display: !!yLabel, text: yLabel, color: 'rgba(255,255,255,0.35)', font: { size: 10 } },
    },
  },
});

export const KAIROS_CHARTS = {
  oee: {
    type: 'line',
    label: 'OEE % — Current vs Baseline',
    data: {
      labels: ['08:00','08:15','08:30','08:45','09:00','09:15'],
      datasets: [
        { label: 'OEE % — Current',  data: [91,88,84,81,78,76], borderColor: C.red,   backgroundColor: C.redFill,   fill: true,  tension: 0.3, pointRadius: 3 },
        { label: 'Golden Baseline',   data: [92,93,92,92,92,93], borderColor: C.green, backgroundColor: 'transparent', borderDash: [5,3], tension: 0.3, pointRadius: 0 },
      ],
    },
    options: lineOpts('OEE %'),
  },
  tension: {
    type: 'line',
    label: 'Film Tension Drift — FT-1101',
    data: {
      labels: ['08:00','08:10','08:20','08:30','08:40','08:50','09:00'],
      datasets: [
        { label: 'Film Tension (N)', data: [42,41,39,37,35,34,34], borderColor: C.amber, backgroundColor: C.amberFill, fill: true, tension: 0.3, pointRadius: 3 },
        { label: 'Target (42N)',     data: [42,42,42,42,42,42,42], borderColor: 'rgba(255,255,255,0.25)', borderDash: [4,3], pointRadius: 0 },
      ],
    },
    options: lineOpts('N'),
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
    options: { ...lineOpts('Units'), plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.55)', font: { size: 10 }, boxWidth: 10 } } } },
  },
  reject: {
    type: 'line',
    label: 'Reject Rate % — VI-1101',
    data: {
      labels: ['08:00','08:15','08:30','08:45','09:00'],
      datasets: [
        { label: 'Reject Rate %', data: [1.4,1.8,2.9,3.8,4.2], borderColor: C.red,   backgroundColor: C.redFill,   fill: true, tension: 0.3, pointRadius: 3 },
        { label: 'Limit (1.5%)',  data: [1.5,1.5,1.5,1.5,1.5], borderColor: C.amber, borderDash: [4,3], pointRadius: 0 },
      ],
    },
    options: lineOpts('%'),
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
    options: { ...lineOpts('Value'), plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.55)', font: { size: 10 }, boxWidth: 10 } } } },
  },
  speed: {
    type: 'line',
    label: 'Blister Speed Drift — BM-1101',
    data: {
      labels: ['08:00','08:10','08:20','08:30','08:40','08:50','09:00'],
      datasets: [
        { label: 'Blister Speed (bpm)', data: [240,240,235,224,219,218,218], borderColor: C.amber, backgroundColor: C.amberFill, fill: true, tension: 0.3, pointRadius: 3 },
        { label: 'Setpoint (240 bpm)',  data: [240,240,240,240,240,240,240], borderColor: 'rgba(255,255,255,0.25)', borderDash: [4,3], pointRadius: 0 },
      ],
    },
    options: lineOpts('bpm'),
  },
};
