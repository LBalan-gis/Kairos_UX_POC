import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAppStore } from '../../store/useAppStore';
import { KAIROS_CHARTS } from '../../lib/kairosCharts';
import type { PinnedChart } from '../../types/store';
import './KPIDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ─── Chart theme context ───────────────────────────────────────────────────────
interface Theme { tick: string; grid: string; textMuted: string; }

const Ctx = createContext<Theme>({ tick: '', grid: '', textMuted: '' });
const useT = () => useContext(Ctx);

function mkTheme(dark: boolean): Theme {
  return {
    tick:      dark ? 'rgba(255,255,255,0.40)' : '#9ca3af',
    grid:      dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    textMuted: dark ? '#8b949e' : '#6b7280',
  };
}

const mkSpikeColors = (dark: boolean) => ({
  crit: dark ? '#ef4444' : '#dc2626',
  warn: dark ? '#f59e0b' : '#d97706',
});

// ─── Constants ────────────────────────────────────────────────────────────────
const N = 36;

interface ChannelDef { seed: number[]; drift: number; noise: number; lo: number; hi: number; }

const CHANNELS: Record<string, ChannelDef> = {
  tension: { seed: mkNoise(42,  -8,   0.6, 1.1), drift:-0.04, noise:0.18, lo:30, hi:50  },
  speed:   { seed: mkNoise(240, -22,  2.0, 3.7), drift:-0.20, noise:0.70, lo:200, hi:265 },
  feed:    { seed: mkNoise(240, -22,  2.5, 2.3), drift:-0.20, noise:0.90, lo:200, hi:265 },
  queue:   { seed: mkNoise(10,  330,  8,   0.9), drift: 3.5,  noise:2.5,  lo:0,   hi:400 },
};

function mkNoise(base: number, drift: number, noise: number, seed: number): number[] {
  return Array.from({ length: N }, (_, i) => {
    const s = Math.sin(i * 5.1 + seed) * 0.5 + Math.sin(i * 2.3 + seed) * 0.3;
    return +(base + drift * (i / (N - 1)) + s * noise).toFixed(2);
  });
}

const norm = (arr: number[], lo: number, hi: number) => arr.map(v => +((v - lo) / (hi - lo) * 100).toFixed(1));

type LiveSnap = Record<string, number[]>;

function useLiveStreams(interval = 2000): LiveSnap {
  const bufs = useRef<Record<string, number[]>>(Object.fromEntries(Object.entries(CHANNELS).map(([k,c]) => [k,[...c.seed]])));
  const tick = useRef(0);
  const [snap, setSnap] = useState<LiveSnap>(() => Object.fromEntries(Object.entries(bufs.current).map(([k,v]) => [k,[...v]])));
  useEffect(() => {
    const id = setInterval(() => {
      tick.current += 1;
      Object.entries(CHANNELS).forEach(([k, c]) => {
        const buf = bufs.current[k];
        const last = buf[buf.length - 1];
        const jitter = (Math.sin(tick.current * 7.3 + c.noise) * 0.5 + Math.sin(tick.current * 3.1) * 0.3) * c.noise;
        buf.shift();
        buf.push(+(Math.max(c.lo, Math.min(c.hi, last + c.drift + jitter))).toFixed(2));
      });
      setSnap(Object.fromEntries(Object.entries(bufs.current).map(([k,v]) => [k,[...v]])));
    }, interval);
    return () => clearInterval(id);
  }, [interval]);
  return snap;
}

const rollingLabels = Array.from({ length: N }, (_, i) => i % 6 === 0 ? `−${N-1-i}s` : '');

// ─── Chart option factories ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkCompOpts(t: Theme): any {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { ticks: { color: t.tick, font: { size: 9, family: 'IBM Plex Mono, monospace' }, maxTicksLimit: 10 }, grid: { color: t.grid } },
      y: { min: 0, max: 100, ticks: { color: t.tick, font: { size: 9, family: 'IBM Plex Mono, monospace' }, callback: (v: number) => v + '%' }, grid: { color: t.grid } },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkTrendOpts(t: Theme, min: number, max: number): any {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { ticks: { color: t.tick, font: { size: 9, family: 'IBM Plex Mono, monospace' }, maxTicksLimit: 8 }, grid: { color: t.grid } },
      y: { min, max, ticks: { color: t.tick, font: { size: 9, family: 'IBM Plex Mono, monospace' }, maxTicksLimit: 5 }, grid: { color: t.grid } },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkSpikeOpts(t: Theme): any {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { display: true, labels: { color: t.textMuted, font: { size: 10, family: 'IBM Plex Mono, monospace' }, boxWidth: 10, padding: 12 } },
      tooltip: { enabled: false },
    },
    scales: {
      x: { ticks: { color: t.tick, font: { size: 9, family: 'IBM Plex Mono, monospace' } }, grid: { color: t.grid } },
      y: { min: 0, ticks: { color: t.tick, font: { size: 9, family: 'IBM Plex Mono, monospace' }, callback: (v: number) => v + 'σ' }, grid: { color: t.grid } },
    },
  };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  name: string; val: string | number; unit: string;
  lo: number; hi: number; pct: string | number; markerPct: number;
  barColor: string; state: string; stats: string; live?: boolean;
}

function KpiCard({ name, val, unit, lo, hi, pct, markerPct, barColor, state, stats, live }: KpiCardProps) {
  return (
    <div className={`kpi-card ${state}`}>
      {live && <span className="kpi-card-live" />}
      <div className="kpi-card-name">{name}</div>
      <div className="kpi-card-value-row">
        <span className="kpi-card-value" style={{ color: `var(--${state === 'crit' ? 'critical' : state === 'warn' ? 'warning' : 'normal'})` }}>{val}</span>
        <span className="kpi-card-unit">{unit}</span>
      </div>
      <div className="kpi-card-range">
        <span className="kpi-card-range-lo">▼ LO: {lo}</span>
        <span className="kpi-card-range-hi">HI: {hi} ▲</span>
      </div>
      <div className="kpi-bar-track">
        <div className="kpi-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
        <div className="kpi-bar-marker" style={{ left: `${markerPct}%` }} />
      </div>
      <div className="kpi-card-stats">{stats}</div>
    </div>
  );
}

// ─── Trend chart card ─────────────────────────────────────────────────────────
interface TrendChartProps {
  label: string; val: string; badge: string; badgeColor: string;
  color: string; data: number[]; lo: number; hi: number; min: number; max: number;
}

function TrendChart({ label, val, badge, badgeColor, color, data, lo, hi, min, max }: TrendChartProps) {
  const t = useT();
  const chartData = {
    labels: rollingLabels,
    datasets: [
      { label, data, borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
      { label: 'LO', data: Array(N).fill(lo), borderColor: '#2563eb', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, fill: false },
      { label: 'HI', data: Array(N).fill(hi), borderColor: '#dc2626', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, fill: false },
    ],
  };
  return (
    <div className="kpi-trend-card">
      <div className="kpi-trend-header">
        <div className="kpi-trend-left">
          <span className="kpi-live-dot" />
          <span className="kpi-trend-param">{label}</span>
        </div>
        <div className="kpi-trend-right">
          <span className="kpi-trend-val" style={{ color: badgeColor }}>{val}</span>
          <span className="kpi-trend-badge" style={{ background: badgeColor + '22', color: badgeColor, borderColor: badgeColor + '55' }}>{badge}</span>
        </div>
      </div>
      <div className="kpi-trend-chart">
        <Line data={chartData} options={mkTrendOpts(t, min, max)} />
      </div>
    </div>
  );
}

// ─── Pinned chart card ────────────────────────────────────────────────────────
function PinnedCard({ item, onUnpin, dark }: { item: PinnedChart; onUnpin: () => void; dark: boolean }) {
  const cfg = KAIROS_CHARTS[item.chartKey];
  if (!cfg) return null;
  const ChartComp = cfg.type === 'bar' ? Bar : Line;
  return (
    <div className="kpi-pinned-card">
      <div className="kpi-pinned-header">
        <span className="kpi-pinned-title">{item.title}</span>
        <button className="kpi-pinned-close" onClick={onUnpin} title="Remove">×</button>
      </div>
      <div className="kpi-pinned-chart">
        <ChartComp data={cfg.data} options={cfg.getOptions(dark)} />
      </div>
    </div>
  );
}

// ─── Spike events data ────────────────────────────────────────────────────────
interface SpikeEvent { time: string; name: string; detail: string; mag: string; level: string; }

const SPIKE_EVENTS: SpikeEvent[] = [
  { time: '09:02', name: 'Hidden Loss OEE-2026-031',  detail: '23 min micro-stop loss — 11 events, each <2 min — OEE threshold not crossed', mag: '−14pt', level: 'crit' },
  { time: '08:14', name: 'Film Tension · BM-1101',    detail: '−8N in 14 min — ΔZ = −4.1σ — PLC auto-reduced speed',                         mag: '−4.1σ', level: 'crit' },
  { time: '08:31', name: 'Micro-jams · CT-1101',      detail: '11 micro-jams in 18 min — ΔZ = +3.8σ — cartoner starved',                     mag: '+3.8σ', level: 'warn' },
  { time: '08:47', name: 'Output Gap · Line 1',       detail: '−1,840 units vs plan — ΔZ = −2.3σ — gap widening at 2.3/min',                 mag: '−2.3σ', level: 'warn' },
];

interface SpRow { param: string; tag: string; sp: string; ll: number | string; lo: number; hi: number; hh: number | string; status: string; level: string; changed: string; }

const SP_ROWS: SpRow[] = [
  { param: 'Film Tension',  tag: 'TT-1101.PV',  sp: '42 N',     ll: 30,   lo: 38,   hi: 46,   hh: 50,   status: 'BELOW LO', level: 'warn', changed: '2026-03-18 08:14' },
  { param: 'Blister Speed', tag: 'ST-1101.PV',  sp: '240 bpm',  ll: 200,  lo: 220,  hi: 255,  hh: 265,  status: 'DRIFTING',  level: 'warn', changed: '2026-03-18 08:14' },
  { param: 'Cartoner Feed', tag: 'CT-1101.SPD', sp: '240 bpm',  ll: 200,  lo: 220,  hi: 255,  hh: 265,  status: 'STARVED',   level: 'crit', changed: '2026-03-18 08:31' },
  { param: 'Serial Queue',  tag: 'SQ-1101.CNT', sp: '< 50',     ll: '—',  lo: 0,    hi: 50,   hh: 200,  status: 'ABOVE HI',  level: 'warn', changed: '2026-03-18 08:47' },
  { param: 'OEE Line 1',   tag: 'OEE.L1.PCT',  sp: '≥ 92.4 %', ll: 70.0, lo: 85.0, hi: 100,  hh: '—',  status: 'BELOW LO',  level: 'warn', changed: '2026-03-18 07:45' },
  { param: 'Shift Output',  tag: 'L1.OUTPUT',   sp: '4 800',    ll: 2000, lo: 2400, hi: 4800, hh: '—',  status: 'BELOW LO',  level: 'warn', changed: '2026-03-18 07:45' },
];

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function KPIDashboard() {
  const dark         = useAppStore(s => s.dark);
  const pinnedCharts = useAppStore(s => s.pinnedCharts);
  const unpinChart   = useAppStore(s => s.unpinChart);
  const t  = mkTheme(dark);
  const sp = mkSpikeColors(dark);

  const [sub, setSub] = useState('overview');
  const clock = useClock();
  const live  = useLiveStreams(2000);

  const tensionNow = live.tension[live.tension.length - 1];
  const speedNow   = live.speed[live.speed.length - 1];
  const feedNow    = live.feed[live.feed.length - 1];
  const queueNow   = Math.round(live.queue[live.queue.length - 1]);

  const tensionPct = Math.max(0, Math.min(100, ((tensionNow - 30) / 20) * 100));
  const speedPct   = Math.max(0, Math.min(100, ((speedNow  - 200) / 65) * 100));
  const queuePct   = Math.min(100, (queueNow / 400) * 100);

  const compData = {
    labels: rollingLabels,
    datasets: [
      { label: 'Film Tension',  data: norm(live.tension, 30, 50),   borderColor: '#60a5fa', borderWidth: 2,   tension: 0.4, pointRadius: 0, fill: false },
      { label: 'Blister Speed', data: norm(live.speed, 200, 265),   borderColor: '#f87171', borderWidth: 2,   tension: 0.4, pointRadius: 0, fill: false },
      { label: 'Cartoner Feed', data: norm(live.feed, 200, 265),    borderColor: '#fbbf24', borderWidth: 1.5, tension: 0.4, pointRadius: 0, fill: false },
      { label: 'Serial Queue',  data: norm(live.queue, 0, 400),     borderColor: '#a78bfa', borderWidth: 1.5, tension: 0.4, pointRadius: 0, fill: false },
      { label: 'SP Low',  data: Array(N).fill(25), borderColor: '#94a3b8', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, fill: false },
      { label: 'SP High', data: Array(N).fill(75), borderColor: '#ef4444', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, backgroundColor: 'rgba(239,68,68,0.06)', fill: '+1' },
    ],
  };

  const spikeZData = {
    labels: ['−36m', '−30m', '−24m', '−18m', '−12m', '−6m', 'Now'],
    datasets: [
      { label: 'Film Tension',  data: [0.2,0.5,1.1,2.3,4.1,4.3,+(4.0+(42-tensionNow)*0.15).toFixed(2)], borderColor: '#60a5fa', backgroundColor: '#60a5fa22', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
      { label: 'Blister Speed', data: [0.1,0.3,0.9,1.8,2.5,2.8,+(2.7+(240-speedNow)*0.02).toFixed(2)],  borderColor: '#f87171', backgroundColor: '#f8717122', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
      { label: 'Micro-jams',    data: [0.0,0.0,0.2,1.4,2.9,3.8,3.6],                                    borderColor: '#fbbf24', backgroundColor: '#fbbf2422', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
      { label: '2σ Threshold',  data: [2,2,2,2,2,2,2], borderColor: '#ef4444', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, fill: false },
    ],
  };

  const liveTags = ['TT-1101.PV', 'ST-1101.PV', 'CT-1101.SPD', 'SQ-1101.CNT'];
  const spCurrVal = (tag: string) => {
    if (tag === 'TT-1101.PV')  return `${tensionNow.toFixed(1)} N`;
    if (tag === 'ST-1101.PV')  return `${speedNow.toFixed(0)} bpm`;
    if (tag === 'CT-1101.SPD') return `${feedNow.toFixed(0)} bpm`;
    if (tag === 'SQ-1101.CNT') return `${queueNow} units`;
    if (tag === 'OEE.L1.PCT')  return '78.4 %';
    return '1 120 units';
  };

  const tabs: [string, string][] = [
    ['overview', 'Overview'],
    ['trend',    'Trend Analysis'],
    ['spike',    'Spike Detection'],
    ['setpoints','Setpoints & Limits'],
  ];

  return (
    <Ctx.Provider value={t}>
      <div className="kpi-root">

        <div className="kpi-topbar">
          <div>
            <div className="kpi-topbar-title">Kairos · Packaging · Line 1</div>
            <div className="kpi-topbar-meta">Batch PH-2026-018 · Active · Shift B</div>
          </div>
          <div className="kpi-topbar-right">
            <span className="kpi-status-item" style={{ color: 'var(--critical)' }}>
              <span className="kpi-status-dot" style={{ background: 'var(--critical)' }} />
              1 Active Alarm
            </span>
            <span className="kpi-status-item" style={{ color: 'var(--normal)' }}>
              <span className="kpi-status-dot" style={{ background: 'var(--normal)' }} />
              MES Connected
            </span>
            <span className="kpi-status-item" style={{ color: 'var(--normal)' }}>
              <span className="kpi-status-dot" style={{ background: 'var(--normal)' }} />
              SCADA Online
            </span>
            <span className="kpi-clock">{clock}</span>
          </div>
        </div>

        <div className="kpi-tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className={`kpi-tab${sub === id ? ' active' : ''}`} onClick={() => setSub(id)}>
              {label}
            </button>
          ))}
        </div>

        {sub === 'overview' && (
          <div className="kpi-content">
            <div className="kpi-section-head">Configured Setpoints — Statistical Derivation (Last 36 min)</div>
            <div className="kpi-section-desc">
              Setpoints derived from process baseline: <b>Low</b> = μ − 1.5σ &nbsp;|&nbsp; <b>Normal</b> = μ ± σ &nbsp;|&nbsp; <b>High</b> = μ + 2σ
            </div>
            <div className="kpi-cards-grid">
              <KpiCard live name="Film Tension · FT-1101"  val={tensionNow.toFixed(1)} unit="N"        lo={38}   hi={46}   pct={tensionPct.toFixed(0)} markerPct={50} barColor="var(--warning)"  state="warn" stats={`Mean: 42 N · σ: 1.8`} />
              <KpiCard live name="Blister Speed · ST-1101" val={speedNow.toFixed(0)}   unit="bpm"      lo={220}  hi={255}  pct={speedPct.toFixed(0)}   markerPct={57} barColor="var(--warning)"  state="warn" stats={`Mean: 240 bpm · σ: 4.2`} />
              <KpiCard live name="Cartoner Feed · CT-1101" val={feedNow.toFixed(0)}    unit="bpm"      lo={220}  hi={255}  pct={speedPct.toFixed(0)}   markerPct={57} barColor="var(--critical)" state="crit" stats="Micro-jams: 11 · Hidden: 23 min" />
              <KpiCard live name="Serial Queue · SQ-1101"  val={queueNow}              unit="units"    lo={0}    hi={50}   pct={queuePct.toFixed(0)}   markerPct={14} barColor="var(--warning)"  state="warn" stats="Mean: 12 units · σ: 3.0" />
              <KpiCard      name="OEE Line 1"              val="78.4"                  unit="%"        lo={85}   hi={100}  pct={0}                     markerPct={72} barColor="var(--warning)"  state="warn" stats="Target: 92.4% · Gap: −1 840 units" />
              <KpiCard      name="Shift Output"            val="1 120"                 unit="units"    lo={2400} hi={4800} pct={23}                    markerPct={50} barColor="var(--warning)"  state="warn" stats="Target: 4 800 · Behind: −1 840" />
            </div>
            <div className="kpi-chart-block" style={{ height: 200 }}>
              <div className="kpi-chart-head">
                <div className="kpi-chart-label-row">
                  <span className="kpi-live-dot" />
                  <span className="kpi-chart-title">Process Parameter Trend — Live</span>
                </div>
                <div className="kpi-chart-legend">
                  {([['#60a5fa','Film Tension'],['#f87171','Blister Speed'],['#fbbf24','Cartoner'],['#a78bfa','Queue']] as [string,string][]).map(([c, l]) => (
                    <span key={l} className="kpi-chart-legend-item">
                      <span className="kpi-chart-legend-swatch" style={{ background: c }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="kpi-chart-canvas">
                <Line data={compData} options={mkCompOpts(t)} />
              </div>
            </div>
            {pinnedCharts.length > 0 && (
              <div className="kpi-pinned-section">
                <div className="kpi-pinned-head">Pinned From KairOS</div>
                <div className="kpi-pinned-grid">
                  {pinnedCharts.map(item => (
                    <PinnedCard key={item.id} item={item} dark={dark} onUnpin={() => unpinChart(item.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sub === 'trend' && (
          <div className="kpi-content">
            <div className="kpi-section-head">Individual Parameter Trends — Live · 2s Update</div>
            <div className="kpi-trend-grid">
              <TrendChart label="Film Tension · FT-1101"  val={`${tensionNow.toFixed(1)} N ↓`}  badge="BELOW LO" badgeColor={sp.warn} color="#60a5fa" data={live.tension} lo={38}  hi={46}  min={28}  max={50}  />
              <TrendChart label="Blister Speed · ST-1101" val={`${speedNow.toFixed(0)} bpm ↓`} badge="DRIFTING"  badgeColor={sp.warn} color="#f87171" data={live.speed}   lo={220} hi={255} min={200} max={265} />
              <TrendChart label="Cartoner Feed · CT-1101" val={`${feedNow.toFixed(0)} bpm ↓`}  badge="STARVED"   badgeColor={sp.crit} color="#fbbf24" data={live.feed}    lo={220} hi={255} min={200} max={265} />
              <TrendChart label="Serial Queue · SQ-1101"  val={`${queueNow} units ↑`}           badge="CRITICAL"  badgeColor={sp.crit} color="#a78bfa" data={live.queue}   lo={0}   hi={50}  min={0}   max={400} />
            </div>
          </div>
        )}

        {sub === 'spike' && (
          <div className="kpi-content">
            <div className="kpi-section-head">Anomaly Events — Rate-of-Change Exceeds 2σ Threshold</div>
            <div className="kpi-spike-events">
              {SPIKE_EVENTS.map((ev, i) => (
                <div key={i} className={`kpi-spike-row ${ev.level}`}>
                  <span className="kpi-spike-time">{ev.time}</span>
                  <div className="kpi-spike-body">
                    <div className="kpi-spike-name">{ev.name}</div>
                    <div className="kpi-spike-detail">{ev.detail}</div>
                  </div>
                  <span className="kpi-spike-mag" style={{ color: sp[ev.level as keyof typeof sp] }}>{ev.mag}</span>
                  <span className="kpi-spike-badge" style={{ background: sp[ev.level as keyof typeof sp] + '22', color: sp[ev.level as keyof typeof sp], borderColor: sp[ev.level as keyof typeof sp] + '55' }}>
                    {ev.level === 'crit' ? 'Critical' : 'Warning'}
                  </span>
                </div>
              ))}
            </div>
            <div className="kpi-section-head">Z-Score Magnitude — Live Last Point</div>
            <div className="kpi-spike-chart">
              <Line data={spikeZData} options={mkSpikeOpts(t)} />
            </div>
          </div>
        )}

        {sub === 'setpoints' && (
          <div className="kpi-content">
            <div className="kpi-section-head">Alarm Limits & Setpoints — Active Configuration</div>
            <div className="kpi-setpoints">
              <table className="kpi-sp-table">
                <thead>
                  <tr>
                    {['Parameter','Tag','Current','Setpoint','LL','LO','HI','HH','Status','Last Changed'].map(h => (
                      <th key={h} className="kpi-sp-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SP_ROWS.map((r, i) => {
                    const isLive = liveTags.includes(r.tag);
                    return (
                      <tr key={i}>
                        <td className="kpi-sp-td">
                          {isLive
                            ? <span className="kpi-sp-live"><span className="kpi-sp-live-dot" />{r.param}</span>
                            : r.param}
                        </td>
                        <td className="kpi-sp-td"><span className="kpi-sp-tag">{r.tag}</span></td>
                        <td className="kpi-sp-td">
                          <span className="kpi-sp-curr" style={{ color: sp[r.level as keyof typeof sp] }}>{spCurrVal(r.tag)}</span>
                        </td>
                        <td className="kpi-sp-td muted">{r.sp}</td>
                        <td className="kpi-sp-td muted">{r.ll}</td>
                        <td className="kpi-sp-td lo">{r.lo}</td>
                        <td className="kpi-sp-td hi">{r.hi}</td>
                        <td className="kpi-sp-td muted">{r.hh}</td>
                        <td className="kpi-sp-td">
                          <span className="kpi-sp-badge" style={{ background: sp[r.level as keyof typeof sp] + '22', color: sp[r.level as keyof typeof sp], borderColor: sp[r.level as keyof typeof sp] + '55' }}>{r.status}</span>
                        </td>
                        <td className="kpi-sp-td muted">{r.changed}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Ctx.Provider>
  );
}

// Keep TS happy: ReactNode is used in Ctx.Provider
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ReactNode = ReactNode;
