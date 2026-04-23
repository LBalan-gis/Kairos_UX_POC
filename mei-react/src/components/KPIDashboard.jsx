import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAppStore } from '../store/useAppStore';
import { KAIROS_CHARTS } from '../lib/kairosCharts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ─── Theme ────────────────────────────────────────────────────────────────────
const Ctx = createContext({});
const useT = () => useContext(Ctx);

function mkTheme(dark) {
  return dark ? {
    bg:          '#0d1117',
    bgCard:      'rgba(22,28,36,0.97)',
    bgCardAlt:   'rgba(22,28,36,0.8)',
    text:        '#e6edf3',
    textMuted:   '#8b949e',
    border:      'rgba(255,255,255,0.08)',
    borderFaint: 'rgba(255,255,255,0.06)',
    accent:      '#58a6ff',
    tick:        '#6b7280',
    grid:        'rgba(255,255,255,0.05)',
    barTrack:    'rgba(255,255,255,0.08)',
    rowAlt:      'rgba(255,255,255,0.02)',
    cardWarn:    { bg:'#1c1a0e', border:'rgba(217,119,6,0.35)',  left:'#d97706' },
    cardCrit:    { bg:'#1c0e0e', border:'rgba(220,38,38,0.35)',  left:'#dc2626' },
    cardOk:      { bg:'#0e1c0f', border:'rgba(22,163,74,0.30)',  left:'#16a34a' },
    pinnedBg:    'linear-gradient(180deg,#0e1e36 0%,#0b1828 100%)',
    pinnedBorder:'rgba(90,130,210,0.22)',
    pinnedAccent:'#4a72b8',
    pinnedTitle: '#7aa3d6',
    pinnedLabel: '#5580c0',
    subtabActive:'#58a6ff',
  } : {
    bg:          '#f5f7fa',
    bgCard:      'rgba(255,255,255,0.97)',
    bgCardAlt:   '#ffffff',
    text:        '#111827',
    textMuted:   '#6b7280',
    border:      'rgba(0,0,0,0.08)',
    borderFaint: 'rgba(0,0,0,0.06)',
    accent:      '#2563eb',
    tick:        '#9ca3af',
    grid:        'rgba(0,0,0,0.06)',
    barTrack:    'rgba(0,0,0,0.08)',
    rowAlt:      'rgba(0,0,0,0.02)',
    cardWarn:    { bg:'#fffbf0', border:'rgba(217,119,6,0.30)',  left:'#d97706' },
    cardCrit:    { bg:'#fff5f5', border:'rgba(220,38,38,0.28)',  left:'#dc2626' },
    cardOk:      { bg:'#f0fdf4', border:'rgba(22,163,74,0.25)',  left:'#16a34a' },
    pinnedBg:    '#eef3fc',
    pinnedBorder:'rgba(53,92,154,0.20)',
    pinnedAccent:'#355C9A',
    pinnedTitle: '#2C5899',
    pinnedLabel: '#2C5899',
    subtabActive:'#2563eb',
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const N    = 36;
const mono = "'IBM Plex Mono', ui-monospace, monospace";
const valColor   = { warn:'#d97706', crit:'#dc2626', ok:'#16a34a' };
const spikeColors = { crit:'#dc2626', warn:'#d97706' };

// ─── Seed data ────────────────────────────────────────────────────────────────
const mkNoise = (base, drift, noise, seed) =>
  Array.from({ length: N }, (_, i) => {
    const s = Math.sin(i * 5.1 + seed) * 0.5 + Math.sin(i * 2.3 + seed) * 0.3;
    return +(base + drift * (i / (N - 1)) + s * noise).toFixed(2);
  });

const norm = (arr, lo, hi) => arr.map(v => +((v - lo) / (hi - lo) * 100).toFixed(1));

const CHANNELS = {
  tension: { seed: mkNoise(42,  -8,   0.6, 1.1), drift:-0.04, noise:0.18, lo:30, hi:50  },
  speed:   { seed: mkNoise(240, -22,  2.0, 3.7), drift:-0.20, noise:0.70, lo:200, hi:265 },
  feed:    { seed: mkNoise(240, -22,  2.5, 2.3), drift:-0.20, noise:0.90, lo:200, hi:265 },
  queue:   { seed: mkNoise(10,  330,  8,   0.9), drift: 3.5,  noise:2.5,  lo:0,   hi:400 },
};

function useLiveStreams(interval = 2000) {
  const bufs = useRef(Object.fromEntries(Object.entries(CHANNELS).map(([k,c]) => [k,[...c.seed]])));
  const tick = useRef(0);
  const [snap, setSnap] = useState(() => Object.fromEntries(Object.entries(bufs.current).map(([k,v]) => [k,[...v]])));
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
function mkCompOpts(t) {
  return {
    responsive:true, maintainAspectRatio:false, animation:false,
    plugins:{ legend:{ display:false }, tooltip:{ enabled:false } },
    scales:{
      x:{ ticks:{ color:t.tick, font:{ size:9, family:'monospace' }, maxTicksLimit:10 }, grid:{ color:t.grid } },
      y:{ min:0, max:100, ticks:{ color:t.tick, font:{ size:9, family:'monospace' }, callback:v=>v+'%' }, grid:{ color:t.grid } },
    },
  };
}
function mkTrendOpts(t, min, max) {
  return {
    responsive:true, maintainAspectRatio:false, animation:false,
    plugins:{ legend:{ display:false }, tooltip:{ enabled:false } },
    scales:{
      x:{ ticks:{ color:t.tick, font:{ size:8, family:'monospace' }, maxTicksLimit:8 }, grid:{ color:t.grid } },
      y:{ min, max, ticks:{ color:t.tick, font:{ size:8, family:'monospace' }, maxTicksLimit:5 }, grid:{ color:t.grid } },
    },
  };
}
function mkSpikeOpts(t) {
  return {
    responsive:true, maintainAspectRatio:false, animation:false,
    plugins:{ legend:{ display:true, labels:{ color:t.textMuted, font:{ size:9, family:'monospace' }, boxWidth:8 } }, tooltip:{ enabled:false } },
    scales:{
      x:{ ticks:{ color:t.tick, font:{ size:9, family:'monospace' } }, grid:{ color:t.grid } },
      y:{ min:0, ticks:{ color:t.tick, font:{ size:9, family:'monospace' }, callback:v=>v+'σ' }, grid:{ color:t.grid } },
    },
  };
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ name, val, unit, lo, hi, pct, markerPct, barColor, state, stats, live }) {
  const t = useT();
  const cs = t[`card${state.charAt(0).toUpperCase()+state.slice(1)}`];
  return (
    <div style={{ background:cs.bg, borderRadius:4, padding:13, cursor:'pointer', border:`1px solid ${cs.border}`, borderLeft:cs.left, position:'relative' }}>
      {live && <span style={{ position:'absolute', top:8, right:10, width:5, height:5, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 5px #22c55e', display:'inline-block' }} />}
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:t.textMuted, marginBottom:5 }}>{name}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:5 }}>
        <span style={{ fontSize:24, fontWeight:700, lineHeight:1, color:valColor[state] }}>{val}</span>
        <span style={{ fontSize:11, color:t.textMuted }}>{unit}</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, marginBottom:5, marginTop:3 }}>
        <span style={{ color:'#2563eb' }}>▼ LO: {lo}</span>
        <span style={{ color:'#dc2626' }}>HI: {hi} ▲</span>
      </div>
      <div style={{ height:5, background:t.barTrack, borderRadius:3, position:'relative', marginBottom:8, overflow:'visible' }}>
        <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:barColor, minWidth:3, transition:'width 0.8s ease' }} />
        <div style={{ position:'absolute', top:-3, left:`${markerPct}%`, transform:'translateX(-50%)', width:2, height:11, background:t.textMuted, borderRadius:1 }} />
      </div>
      <div style={{ fontSize:9, color:t.textMuted, lineHeight:1.4 }}>{stats}</div>
    </div>
  );
}

// ─── Trend chart ───────────────────────────────────────────────────────────────
function TrendChart({ label, val, badge, badgeColor, color, data, lo, hi, min, max }) {
  const t = useT();
  const chartData = {
    labels: rollingLabels,
    datasets:[
      { label, data, borderColor:color, backgroundColor:color+'22', fill:true, tension:0.4, pointRadius:0, borderWidth:2 },
      { label:'LO', data:Array(N).fill(lo), borderColor:'#2563eb', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false },
      { label:'HI', data:Array(N).fill(hi), borderColor:'#dc2626', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false },
    ],
  };
  return (
    <div style={{ background:t.bgCardAlt, border:`1px solid ${t.border}`, borderRadius:4, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 5px #22c55e', display:'inline-block', flexShrink:0 }} />
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', color:t.textMuted, textTransform:'uppercase' }}>{label}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:badgeColor==='#dc2626'?'#ef4444':'#f59e0b', fontFamily:mono }}>{val}</span>
          <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 6px', borderRadius:3, background:badgeColor+'22', color:badgeColor, border:`1px solid ${badgeColor}44` }}>{badge}</span>
        </div>
      </div>
      <div style={{ height:100 }}>
        <Line data={chartData} options={mkTrendOpts(t, min, max)} />
      </div>
    </div>
  );
}

// ─── Pinned chart card ─────────────────────────────────────────────────────────
function PinnedCard({ item, onUnpin }) {
  const t   = useT();
  const cfg = KAIROS_CHARTS[item.chartKey];
  if (!cfg) return null;
  const ChartComp = cfg.type === 'bar' ? Bar : Line;
  return (
    <div style={{ background:t.pinnedBg, border:`1px solid ${t.pinnedBorder}`, borderLeft:`3px solid ${t.pinnedAccent}`, borderRadius:4, padding:'10px 13px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:700, color:t.pinnedTitle, letterSpacing:'0.02em' }}>{item.title}</span>
        <button onClick={onUnpin} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:t.textMuted, lineHeight:1, padding:'0 2px', borderRadius:4 }} title="Remove">×</button>
      </div>
      <div style={{ height:130, borderRadius:6, overflow:'hidden' }}>
        <ChartComp data={cfg.data} options={cfg.options} />
      </div>
    </div>
  );
}

// ─── Spike events ──────────────────────────────────────────────────────────────
const SPIKE_EVENTS = [
  { time:'09:02', name:'Hidden Loss OEE-2026-031',  detail:'23 min micro-stop loss — 11 events, each <2 min — OEE threshold not crossed', mag:'−14pt', level:'crit' },
  { time:'08:14', name:'Film Tension · BM-1101',     detail:'−8N in 14 min — ΔZ = −4.1σ — PLC auto-reduced speed',                         mag:'−4.1σ', level:'crit' },
  { time:'08:31', name:'Micro-jams · CT-1101',       detail:'11 micro-jams in 18 min — ΔZ = +3.8σ — cartoner starved',                      mag:'+3.8σ', level:'warn' },
  { time:'08:47', name:'Output Gap · Line 1',        detail:'−1,840 units vs plan — ΔZ = −2.3σ — gap widening at 2.3/min',                  mag:'−2.3σ', level:'warn' },
];

const SP_ROWS = [
  { param:'Film Tension',  tag:'TT-1101.PV',  sp:'42 N',     ll:30,   lo:38,   hi:46,   hh:50,   status:'BELOW LO', level:'warn', changed:'2026-03-18 08:14' },
  { param:'Blister Speed', tag:'ST-1101.PV',  sp:'240 bpm',  ll:200,  lo:220,  hi:255,  hh:265,  status:'DRIFTING',  level:'warn', changed:'2026-03-18 08:14' },
  { param:'Cartoner Feed', tag:'CT-1101.SPD', sp:'240 bpm',  ll:200,  lo:220,  hi:255,  hh:265,  status:'STARVED',   level:'crit', changed:'2026-03-18 08:31' },
  { param:'Serial Queue',  tag:'SQ-1101.CNT', sp:'< 50',     ll:'—',  lo:0,    hi:50,   hh:200,  status:'ABOVE HI',  level:'warn', changed:'2026-03-18 08:47' },
  { param:'OEE Line 1',    tag:'OEE.L1.PCT',  sp:'≥ 92.4 %', ll:70.0, lo:85.0, hi:100,  hh:'—',  status:'BELOW LO',  level:'warn', changed:'2026-03-18 07:45' },
  { param:'Shift Output',  tag:'L1.OUTPUT',   sp:'4 800',    ll:2000, lo:2400, hi:4800, hh:'—',  status:'BELOW LO',  level:'warn', changed:'2026-03-18 07:45' },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}

function SubTab({ label, active, onClick }) {
  const t = useT();
  return (
    <button onClick={onClick} style={{
      fontSize:9, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase',
      color: active ? t.subtabActive : t.textMuted,
      padding:'8px 14px', cursor:'pointer', border:'none',
      borderBottom: active ? `2px solid ${t.subtabActive}` : '2px solid transparent',
      background:'none', fontFamily:mono, whiteSpace:'nowrap', transition:'color 0.15s',
    }}>{label}</button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function KPIDashboard() {
  const dark         = useAppStore(s => s.dark);
  const pinnedCharts = useAppStore(s => s.pinnedCharts);
  const unpinChart   = useAppStore(s => s.unpinChart);
  const t            = mkTheme(dark);

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
    datasets:[
      { label:'Film Tension',  data:norm(live.tension,30,50),  borderColor:'#60a5fa', borderWidth:2,   tension:0.4, pointRadius:0, fill:false },
      { label:'Blister Speed', data:norm(live.speed,200,265),  borderColor:'#f87171', borderWidth:2,   tension:0.4, pointRadius:0, fill:false },
      { label:'Cartoner Feed', data:norm(live.feed,200,265),   borderColor:'#fbbf24', borderWidth:1.5, tension:0.4, pointRadius:0, fill:false },
      { label:'Serial Queue',  data:norm(live.queue,0,400),    borderColor:'#a78bfa', borderWidth:1.5, tension:0.4, pointRadius:0, fill:false },
      { label:'SP Low',  data:Array(N).fill(25), borderColor:'#94a3b8', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false },
      { label:'SP High', data:Array(N).fill(75), borderColor:'#ef4444', borderWidth:1, borderDash:[4,3], pointRadius:0, backgroundColor:'rgba(239,68,68,0.06)', fill:'+1' },
    ],
  };

  const spikeZData = {
    labels:['−36m','−30m','−24m','−18m','−12m','−6m','Now'],
    datasets:[
      { label:'Film Tension',  data:[0.2,0.5,1.1,2.3,4.1,4.3,+(4.0+(42-tensionNow)*0.15).toFixed(2)], borderColor:'#60a5fa', backgroundColor:'#60a5fa22', fill:true, tension:0.4, pointRadius:2, borderWidth:1.5 },
      { label:'Blister Speed', data:[0.1,0.3,0.9,1.8,2.5,2.8,+(2.7+(240-speedNow)*0.02).toFixed(2)],  borderColor:'#f87171', backgroundColor:'#f8717122', fill:true, tension:0.4, pointRadius:2, borderWidth:1.5 },
      { label:'Micro-jams',    data:[0.0,0.0,0.2,1.4,2.9,3.8,3.6],                                    borderColor:'#fbbf24', backgroundColor:'#fbbf2422', fill:true, tension:0.4, pointRadius:2, borderWidth:1.5 },
      { label:'2σ Threshold',  data:[2,2,2,2,2,2,2], borderColor:'#ef4444', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false },
    ],
  };

  return (
    <Ctx.Provider value={t}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:t.bg, color:t.text, fontFamily:mono, overflow:'hidden', minHeight:0 }}>

        {/* Topbar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:`1px solid ${t.border}`, background:t.bgCard, flexShrink:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:'0.08em' }}>KAIROS · PACKAGING · LINE 1</span>
            <span style={{ fontSize:10, color:t.textMuted, letterSpacing:'0.06em' }}>BATCH PH-2026-018 · ACTIVE · SHIFT B</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <span style={{ fontSize:10, letterSpacing:'0.05em', color:'#dc2626' }}>⬤ 1 ACTIVE ALARM</span>
            <span style={{ fontSize:10, letterSpacing:'0.05em', color:'#16a34a' }}>⬤ MES CONNECTED</span>
            <span style={{ fontSize:10, letterSpacing:'0.05em', color:'#16a34a' }}>⬤ SCADA ONLINE</span>
            <span style={{ fontSize:11, color:t.textMuted, letterSpacing:'0.08em' }}>{clock}</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display:'flex', borderBottom:`1px solid ${t.border}`, background:t.bgCard, padding:'0 14px', flexShrink:0 }}>
          {['overview','trend','spike','setpoints'].map(s => (
            <SubTab key={s} label={{ overview:'Overview', trend:'Trend Analysis', spike:'Spike Detection', setpoints:'Setpoints & Limits' }[s]} active={sub===s} onClick={()=>setSub(s)} />
          ))}
        </div>

        {/* ── Overview ── */}
        {sub === 'overview' && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <div style={{ padding:'10px 14px 5px', fontSize:9, fontWeight:700, letterSpacing:'0.10em', color:t.accent, textTransform:'uppercase' }}>CONFIGURED SETPOINTS — STATISTICAL DERIVATION (LAST 36 MIN)</div>
            <div style={{ padding:'0 14px 8px', fontSize:9, color:t.textMuted, borderBottom:`1px solid ${t.borderFaint}`, lineHeight:1.5 }}>
              Setpoints derived from process baseline: <b style={{ color:t.text }}>LOW</b> = μ − 1.5σ &nbsp;|&nbsp; <b style={{ color:t.text }}>NORMAL</b> = μ ± σ &nbsp;|&nbsp; <b style={{ color:t.text }}>HIGH</b> = μ + 2σ
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:12, padding:13, borderBottom:`1px solid ${t.borderFaint}` }}>
              <KpiCard live name="Film Tension FT-1101"  val={tensionNow.toFixed(1)} unit="N"        lo={38}  hi={46}  pct={tensionPct.toFixed(0)} markerPct={50} barColor="#f59e0b" state="warn" stats="Mean: 42 N · σ: 1.8" />
              <KpiCard live name="Blister Speed ST-1101" val={speedNow.toFixed(0)}   unit="bpm"      lo={220} hi={255} pct={speedPct.toFixed(0)}   markerPct={57} barColor="#f59e0b" state="warn" stats="Mean: 240 bpm · σ: 4.2" />
              <KpiCard live name="Cartoner Feed CT-1101" val={feedNow.toFixed(0)}    unit="bpm feed" lo={220} hi={255} pct={speedPct.toFixed(0)}   markerPct={57} barColor="#ef4444" state="crit" stats="Micro-jams: 11 · Hidden: 23 min" />
              <KpiCard live name="Serial Queue SQ-1101"  val={queueNow}             unit="units"    lo={0}   hi={50}  pct={queuePct.toFixed(0)}   markerPct={14} barColor="#f59e0b" state="warn" stats="Mean: 12 units · σ: 3.0" />
              <KpiCard      name="OEE LINE 1"            val="78.4"                  unit="%"        lo={85}  hi={100} pct={0}                     markerPct={72} barColor="#f59e0b" state="warn" stats="Target: 92.4% · Gap: −1 840 units" />
              <KpiCard      name="SHIFT OUTPUT"          val="1 120"                 unit="units"    lo={2400} hi={4800} pct={23}                  markerPct={50} barColor="#f59e0b" state="warn" stats="Target: 4 800 · Behind: −1 840" />
            </div>

            {/* Live comp chart */}
            <div style={{ margin:13, borderRadius:4, border:`1px solid ${t.border}`, background:t.bgCardAlt, padding:13, height:200, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 5px #22c55e', display:'inline-block' }} />
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.10em', color:t.accent, textTransform:'uppercase' }}>PROCESS PARAMETER TREND — LIVE</span>
                </div>
                <div style={{ display:'flex', gap:13 }}>
                  {[['#60a5fa','Film Tension'],['#f87171','Blister Speed'],['#fbbf24','Cartoner'],['#a78bfa','Queue']].map(([c,l]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:t.textMuted }}>
                      <span style={{ width:8, height:3, borderRadius:2, background:c, display:'inline-block' }} />{l}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ flex:1, minHeight:0 }}>
                <Line data={compData} options={mkCompOpts(t)} />
              </div>
            </div>

            {/* Pinned charts from KairOS */}
            {pinnedCharts.length > 0 && (
              <div style={{ padding:'8px 13px 13px' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.07em', color:t.pinnedLabel, textTransform:'uppercase', marginBottom:8 }}>📌 Pinned from KairOS</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {pinnedCharts.map(item => <PinnedCard key={item.id} item={item} onUnpin={() => unpinChart(item.id)} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Trend Analysis ── */}
        {sub === 'trend' && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <div style={{ padding:'10px 14px 5px', fontSize:9, fontWeight:700, letterSpacing:'0.10em', color:t.accent, textTransform:'uppercase' }}>INDIVIDUAL PARAMETER TRENDS — LIVE · 2s UPDATE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:13 }}>
              <TrendChart label="Film Tension · FT-1101"  val={`${tensionNow.toFixed(1)} N ↓`}  badge="BELOW LO" badgeColor="#d97706" color="#60a5fa" data={live.tension} lo={38}  hi={46}  min={28}  max={50}  />
              <TrendChart label="Blister Speed · ST-1101" val={`${speedNow.toFixed(0)} bpm ↓`} badge="DRIFTING"  badgeColor="#d97706" color="#f87171" data={live.speed}   lo={220} hi={255} min={200} max={265} />
              <TrendChart label="Cartoner Feed · CT-1101" val={`${feedNow.toFixed(0)} bpm ↓`}  badge="STARVED"   badgeColor="#dc2626" color="#fbbf24" data={live.feed}    lo={220} hi={255} min={200} max={265} />
              <TrendChart label="Serial Queue · SQ-1101"  val={`${queueNow} units ↑`}          badge="CRITICAL"  badgeColor="#dc2626" color="#a78bfa" data={live.queue}   lo={0}   hi={50}  min={0}   max={400} />
            </div>
          </div>
        )}

        {/* ── Spike Detection ── */}
        {sub === 'spike' && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <div style={{ padding:'10px 14px 5px', fontSize:9, fontWeight:700, letterSpacing:'0.10em', color:t.accent, textTransform:'uppercase' }}>ANOMALY EVENTS — RATE-OF-CHANGE EXCEEDS 2σ THRESHOLD</div>
            <div style={{ padding:'0 13px', display:'flex', flexDirection:'column', gap:8 }}>
              {SPIKE_EVENTS.map((ev,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px', borderRadius:4, background:spikeColors[ev.level]+'14', border:`1px solid ${spikeColors[ev.level]}33`, borderLeft:`3px solid ${spikeColors[ev.level]}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:t.textMuted, flexShrink:0, letterSpacing:'0.05em' }}>{ev.time}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:t.text, marginBottom:2 }}>{ev.name}</div>
                    <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.4 }}>{ev.detail}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:spikeColors[ev.level], flexShrink:0 }}>{ev.mag}</div>
                  <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 6px', borderRadius:3, background:spikeColors[ev.level]+'22', color:spikeColors[ev.level], border:`1px solid ${spikeColors[ev.level]}44`, flexShrink:0 }}>
                    {ev.level==='crit'?'CRITICAL':'WARNING'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding:'10px 14px 5px', fontSize:9, fontWeight:700, letterSpacing:'0.10em', color:t.accent, textTransform:'uppercase' }}>Z-SCORE MAGNITUDE — LIVE LAST POINT</div>
            <div style={{ margin:'0 13px 13px', height:180, background:t.bgCardAlt, border:`1px solid ${t.border}`, borderRadius:4, padding:'10px 12px' }}>
              <Line data={spikeZData} options={mkSpikeOpts(t)} />
            </div>
          </div>
        )}

        {/* ── Setpoints & Limits ── */}
        {sub === 'setpoints' && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <div style={{ padding:'10px 14px 5px', fontSize:9, fontWeight:700, letterSpacing:'0.10em', color:t.accent, textTransform:'uppercase' }}>ALARM LIMITS & SETPOINTS — ACTIVE CONFIGURATION</div>
            <div style={{ padding:'0 13px 13px', overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10, fontFamily:mono }}>
                <thead>
                  <tr>
                    {['PARAMETER','TAG','CURRENT','SETPOINT','LL','LO','HI','HH','STATUS','LAST CHANGED'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'6px 8px', fontSize:8, fontWeight:700, letterSpacing:'0.08em', color:t.textMuted, borderBottom:`1px solid ${t.border}`, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SP_ROWS.map((r,i) => {
                    const curr =
                      r.tag==='TT-1101.PV'  ? `${tensionNow.toFixed(1)} N` :
                      r.tag==='ST-1101.PV'  ? `${speedNow.toFixed(0)} bpm` :
                      r.tag==='CT-1101.SPD' ? `${feedNow.toFixed(0)} bpm` :
                      r.tag==='SQ-1101.CNT' ? `${queueNow} units` :
                      r.tag==='OEE.L1.PCT'  ? '78.4 %' : '1 120 units';
                    const isLive = ['TT-1101.PV','ST-1101.PV','CT-1101.SPD','SQ-1101.CNT'].includes(r.tag);
                    return (
                      <tr key={i} style={{ background: i%2===0 ? t.rowAlt : 'transparent' }}>
                        <td style={{ padding:'7px 8px', color:t.text }}>
                          {isLive && <span style={{ width:4, height:4, borderRadius:'50%', background:'#22c55e', display:'inline-block', marginRight:6, boxShadow:'0 0 4px #22c55e' }} />}
                          {r.param}
                        </td>
                        <td style={{ padding:'7px 8px', fontFamily:'monospace', color:t.accent, fontSize:9, fontWeight:700 }}>{r.tag}</td>
                        <td style={{ padding:'7px 8px', fontWeight:700, color:spikeColors[r.level] }}>{curr}</td>
                        <td style={{ padding:'7px 8px', color:t.textMuted }}>{r.sp}</td>
                        <td style={{ padding:'7px 8px', color:t.textMuted }}>{r.ll}</td>
                        <td style={{ padding:'7px 8px', color:'#2563eb' }}>{r.lo}</td>
                        <td style={{ padding:'7px 8px', color:'#dc2626' }}>{r.hi}</td>
                        <td style={{ padding:'7px 8px', color:t.textMuted }}>{r.hh}</td>
                        <td style={{ padding:'7px 8px' }}>
                          <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 6px', borderRadius:3, background:spikeColors[r.level]+'22', color:spikeColors[r.level], border:`1px solid ${spikeColors[r.level]}44` }}>{r.status}</span>
                        </td>
                        <td style={{ padding:'7px 8px', color:t.textMuted, fontSize:9, whiteSpace:'nowrap' }}>{r.changed}</td>
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
