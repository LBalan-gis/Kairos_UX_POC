import { useRef, useState, useEffect, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAppStore } from '../../store/useAppStore';
import { KAIROS_CHARTS } from '../../lib/kairosCharts';
import { WidgetRenderer } from '../WidgetRenderer';
import { useKairos } from './KairosContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const CHARTS = KAIROS_CHARTS;

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusColor = { critical:'#b91c1c', warning:'#b45309', ok:'#166534' };
const pillStyle = {
  deviation:{ bg:'#fef2f2', color:'#b91c1c', border:'rgba(239,68,68,0.3)' },
  batch:    { bg:'#f0fdf4', color:'#166534', border:'rgba(34,197,94,0.3)' },
  shift:    { bg:'#f5f3ff', color:'#5b21b6', border:'rgba(139,92,246,0.3)' },
};

function _v(ent, key, fb) {
  const n = Object.values(ent || {}).find(x => x.id.includes(key) || (x.label && x.label.toLowerCase().includes(key)));
  return n && n.metricValue !== undefined ? n.metricValue : fb;
}

// ─── Report builders ──────────────────────────────────────────────────────────
function buildReport(type, ts, ent) {
  const oeeN = _v(ent, 'oee', 78.4);
  const sN = _v(ent, 'blister', 218);
  const tN = _v(ent, 'tension', 34);

  if (type === 'batch') return {
    type:'BATCH', pill:'batch', title:'Batch Record — PH-2026-018', chartKey:'golden',
    meta:['SKU 41829','Lisinopril 10mg','Operator: K. Mueller', ts],
    sections:[
      { label:'Batch Status', text:`Batch PH-2026-018 active on Line 1, Shift B. 1,840 units behind plan. OEE ${oeeN}% — globally compromised.` },
      { label:'Quality', text:'77 units rejected (4.2% vs 1.5% limit). Serial queue at 340 unverified units.' },
      { label:'Open Deviation', text:'OEE-2026-031 — 23 min hidden micro-stop loss. QA acknowledgement pending.' },
    ],
    table:[
      { tag:'OEE',    name:'Efficiency',    current:`${oeeN}%`,   target:'92.4%',      status: oeeN < 85 ? 'warning' : 'ok' },
      { tag:'Speed',  name:'Blister Speed', current:`${sN} bpm`, target:'240 bpm',    status: sN < 230 ? 'warning' : 'ok' },
      { tag:'Output', name:'Units Packed',  current:'1,120',   target:'2,960 plan', status:'critical' },
      { tag:'Reject', name:'Reject Rate',   current:'4.2%',    target:'1.5% limit', status:'critical' },
    ],
  };
  if (type === 'shift') return {
    type:'SHIFT', pill:'shift', title:'Shift Handover — Shift B → C', chartKey:'oee',
    meta:['Line 1','Operator: K. Mueller','Handover to Shift C', ts],
    sections:[
      { label:'Open Incidents', text:'OEE-2026-031 open — film tension drift BM-1101. Tension roller adjustment required.' },
      { label:'Line Status', text:`Line 2 normal — BM-1201 at 240 bpm, OEE 91.8%. Line 1 at risk (OEE ${oeeN}%).` },
      { label:'Handover Notes', text:'Tension roller requires inspection. Serialization queue must be reconciled.' },
    ],
    table:[
      { tag:'L1 OEE',  name:'Line 1',      current:`${oeeN}%`, target:'92.4%', status: oeeN < 85 ? 'warning' : 'ok' },
      { tag:'L2 OEE',  name:'Line 2',      current:'91.8%', target:'92.4%', status:'ok' },
      { tag:'Dev',     name:'Open',        current:'1',     target:'0',     status:'critical' },
      { tag:'Serial',  name:'Queue',       current:'340',   target:'<200',  status:'warning' },
    ],
  };
  return {
    type:'DEVIATION', pill:'deviation', title:'Deviation Report — OEE-2026-031', chartKey:'tension',
    meta:['Batch PH-2026-018','Line 1','Shift B', ts],
    sections:[
      { label:'Incident Summary', text:`Film tension drifted from 42N to ${tN}N. BM-1101 auto-reduced to ${sN} bpm. CT-1101 logged 11 micro-jams.` },
      { label:'Root Cause', text:'Film tension drift at FT-1101, 96% confidence.' },
      { label:'Recommended Action', text:`Adjust tension roller to 42N. Recovery: 12 min, 97% confidence. QA sign-off required.` },
    ],
    table:[
      { tag:'FT-1101', name:'Film Tension',  current:`${tN}N`,      target:'42N',        status: tN < 40 ? 'warning' : 'ok' },
      { tag:'BM-1101', name:'Blister Speed', current:`${sN} bpm`,  target:'240 bpm',    status: sN < 230 ? 'warning' : 'ok' },
      { tag:'VI-1101', name:'Reject Rate',   current:'4.2%',     target:'1.5% limit', status:'critical' },
      { tag:'SZ-1101', name:'Serial Queue',  current:'340 units',target:'<200',       status:'warning' },
    ],
  };
}

// ─── Light chart options (for white report cards) ─────────────────────────────
function mkReportOpts(base) {
  const lightTick = '#6b7280';
  const lightGrid = 'rgba(0,0,0,0.07)';
  return {
    ...base,
    plugins: {
      ...base.plugins,
      legend: { ...base.plugins?.legend, labels: { ...base.plugins?.legend?.labels, color: '#374151' } },
      tooltip: base.plugins?.tooltip,
    },
    scales: base.scales ? {
      x: { ...base.scales.x, grid: { color: lightGrid }, ticks: { color: lightTick, font: { size: 10 } } },
      y: { ...base.scales.y, grid: { color: lightGrid }, ticks: { color: lightTick, font: { size: 10 } },
           title: base.scales.y?.title ? { ...base.scales.y.title, color: '#9ca3af' } : undefined },
    } : undefined,
  };
}

// ─── Report card ──────────────────────────────────────────────────────────────
function ReportCard({ report }) {
  const chartRef = useRef(null);
  const ps = pillStyle[report.pill];
  const rc = report.chartKey ? CHARTS[report.chartKey] : null;
  const RC = rc?.type === 'bar' ? Bar : Line;

  const handlePrint = () => {
    const chartImg = chartRef.current ? chartRef.current.toBase64Image('image/png', 1) : null;
    const w = window.open('', '_blank', 'width=820,height=720');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${report.title}</title>
<style>body{font-family:system-ui,sans-serif;padding:28px;font-size:12px;color:#111;}
table{width:100%;border-collapse:collapse;}th,td{padding:5px 8px;text-align:left;border-bottom:1px solid #e5e7eb;}
th{font-size:9px;text-transform:uppercase;color:#6b7280;}h2{margin:0 0 4px;font-size:15px;}
p{margin:6px 0;line-height:1.6;}.pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;border-radius:3px;margin-bottom:4px;}
.chart-wrap{margin:10px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;}
.chart-wrap img{width:100%;display:block;}
.chart-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;}
</style></head><body>
<div class="pill" style="background:${ps.bg};color:${ps.color};border:1px solid ${ps.border}">${report.type}</div>
<h2>${report.title}</h2>
<p style="font-size:10px;color:#6b7280">${report.meta.join(' · ')}</p>
${report.sections.map(s=>`<p><strong>${s.label}:</strong> ${s.text}</p>`).join('')}
${chartImg && rc ? `<div class="chart-label">${rc.label}</div><div class="chart-wrap"><img src="${chartImg}" /></div>` : ''}
<table><thead><tr><th>Tag</th><th>Parameter</th><th>Current</th><th>Target</th><th>Status</th></tr></thead>
<tbody>${report.table.map(r=>`<tr><td style="font-family:monospace;color:#1d4ed8;font-weight:700">${r.tag}</td><td>${r.name}</td><td style="color:${statusColor[r.status]||'#111'};font-weight:600">${r.current}</td><td style="color:#6b7280">${r.target}</td><td style="color:${statusColor[r.status]||'#111'};font-weight:600;text-transform:capitalize">${r.status}</td></tr>`).join('')}
</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div style={{ width:'100%', background:'rgba(255,255,255,0.95)', borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', overflow:'hidden', fontSize:11.5, color:'#111' }}>
      <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div>
          <div style={{ display:'inline-flex', fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', padding:'2px 6px', borderRadius:3, marginBottom:3, background:ps.bg, color:ps.color, border:`1px solid ${ps.border}` }}>{report.type}</div>
          <div style={{ fontSize:13, fontWeight:700 }}>{report.title}</div>
          <div style={{ fontSize:10, color:'#6b7280', display:'flex', flexWrap:'wrap', gap:6, marginTop:2 }}>
            {report.meta.map((m,i) => <span key={i}>{i>0?'· ':''}{m}</span>)}
          </div>
        </div>
        <button onClick={handlePrint} style={{ fontSize:10, padding:'3px 8px', border:'1px solid rgba(0,0,0,0.12)', borderRadius:4, background:'#fff', cursor:'pointer', color:'#374151', flexShrink:0 }}>Print</button>
      </div>
      <div style={{ padding:'8px 14px 10px', display:'flex', flexDirection:'column', gap:8 }}>
        {report.sections.map((s,i) => (
          <div key={i}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'#6b7280', marginBottom:2 }}>{s.label}</div>
            <div style={{ lineHeight:1.6, color:'#1f2937' }}>{s.text}</div>
          </div>
        ))}
        {rc && (
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'#6b7280', marginBottom:4 }}>{rc.label}</div>
            <div style={{ height:140, background:'rgba(0,0,0,0.03)', borderRadius:6, border:'1px solid rgba(0,0,0,0.07)', padding:'6px 6px 4px' }}>
              <RC ref={chartRef} data={rc.data} options={mkReportOpts(rc.options)} />
            </div>
          </div>
        )}
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['Tag','Parameter','Current','Target','Status'].map(h=>(
            <th key={h} style={{ textAlign:'left', padding:'4px 6px', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(0,0,0,0.08)' }}>{h}</th>
          ))}</tr></thead>
          <tbody>{report.table.map((r,i)=>(
            <tr key={i}>
              <td style={{ padding:'4px 6px', fontFamily:'monospace', fontSize:10, fontWeight:700, color:'#1d4ed8' }}>{r.tag}</td>
              <td style={{ padding:'4px 6px', fontSize:11 }}>{r.name}</td>
              <td style={{ padding:'4px 6px', fontWeight:600, color:statusColor[r.status] }}>{r.current}</td>
              <td style={{ padding:'4px 6px', color:'#6b7280' }}>{r.target}</td>
              <td style={{ padding:'4px 6px', fontWeight:600, color:statusColor[r.status], textTransform:'capitalize' }}>{r.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── OTIF Alert card ──────────────────────────────────────────────────────────
function OTIFAlertCard() {
  const dark = useAppStore(s => s.dark);
  const rows = [
    { label: 'DELIVERY TARGET', value: 'Friday 17:00 · SKU 41829' },
    { label: 'OUTPUT DEFICIT',  value: '1,840 units · +2.3/min' },
    { label: 'ERP SYSTEM',      value: 'SAP S/4HANA · Batch close 14:30' },
    { label: 'RECOVERY PATH',   value: 'BM-1101 correction → 94% OTIF restore' },
  ];
  const colors = dark ? {
    bg: 'rgba(245,158,11,0.08)', headBg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.30)',
    title: '#FBBF24', lbl: '#FCD34D', val: '#FFFFFF'
  } : {
    bg: '#FFFBEB', headBg: '#FEF3C7', border: '#FDE68A',
    title: '#B45309', lbl: '#D97706', val: '#78350F'
  };
  return (
    <div style={{ width:'100%', background: colors.bg, border:`1px solid ${colors.border}`, borderRadius:10, overflow:'hidden' }}>
      <div style={{ padding:'7px 12px', background: colors.headBg, borderBottom:`1px solid ${colors.border}`, display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase', color: colors.title }}>⚠ OTIF Alert — Line 1</span>
        <span style={{ marginLeft:'auto', fontSize:8, color: colors.title, opacity: 0.8 }}>SAP · ERP</span>
      </div>
      <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', gap:5 }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: colors.lbl, flexShrink:0 }}>{label}</span>
            <span style={{ fontSize:10, fontWeight:600, color: colors.val, textAlign:'right' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Signal Trace panel ────────────────────────────────────────────────────────
function TracePanel() {
  const dark = useAppStore(s => s.dark);
  const [polled, setPolled] = useState(847);
  useEffect(() => {
    const id = setInterval(() => setPolled(p => Math.floor(Math.random() * 600 + 200)), 1800);
    return () => clearInterval(id);
  }, []);

  const colors = dark ? {
    bg: '#050505', headBg: 'rgba(42,241,229,0.1)', border: 'rgba(42,241,229,0.3)',
    headTxt: '#2AF1E5', mainTxt: '#FFFFFF', subTxt: '#A1A1AA',
    row0: '#F87171', row1: '#FBBF24', row2: '#2AF1E5', row3: '#4ADE80'
  } : {
    bg: '#FAFAFA', headBg: '#CCFBF1', border: '#99F6E4',
    headTxt: '#0F766E', mainTxt: '#111827', subTxt: '#52525B',
    row0: '#DC2626', row1: '#D97706', row2: '#0F766E', row3: '#15803D'
  };

  const rows = [
    { tag: 'PREDICTION', icon: '⬡', col: colors.row0,
      main: 'Shift B will miss target by 2,200 units',
      sub:  'causal weight: 0.97 · engine: physics-ML hybrid' },
    { tag: 'ROOT CAUSE', icon: '↑', col: colors.row1,
      main: 'Film tension drift · BM-1101 · FT-1101',
      sub:  'sensor reads 34.0 N vs 42.0 N setpoint — Δ −8.0 N' },
    { tag: 'HARDWARE',   icon: '↑', col: colors.row2,
      main: 'FT-1101 · Modbus TCP · 10.0.0.12:502',
      sub:  `register 40001 · last polled ${polled}ms ago · 20Hz` },
    { tag: 'ATTESTATION',icon: '✓', col: colors.row3,
      main: 'Prediction anchored to verified physical node',
      sub:  'KairOS cannot reference sensors absent from the Unified Namespace' },
  ];

  return (
    <div style={{ width:'100%', background: colors.bg, border:`1px solid ${colors.border}`, borderRadius:10, overflow:'hidden', fontFamily:'"Fira Code","Cascadia Code","Consolas",monospace' }}>
      <div style={{ padding:'7px 12px', background: colors.headBg, borderBottom:`1px solid ${colors.border}`, display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:8, fontWeight:700, color: colors.headTxt, letterSpacing:'0.12em', textTransform:'uppercase' }}>SIGNAL TRACE — Prediction Anchor</span>
        <span style={{ marginLeft:'auto', fontSize:8, color: colors.headTxt, opacity: 0.7 }}>FT-1101 · live</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ padding:'7px 12px', borderBottom: i < rows.length-1 ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.10em', color:r.col, width:82, flexShrink:0 }}>{r.tag}</span>
            <span style={{ fontSize:10, color: colors.mainTxt, fontWeight:600 }}>{r.main}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
            <span style={{ width:82, flexShrink:0, fontSize:10, color:r.col, textAlign:'center' }}>{r.icon}</span>
            <span style={{ fontSize:9, color: colors.subTxt }}>{r.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AEGIS Shield rejection ────────────────────────────────────────────────────
function AegisRejection({ msg }) {
  const dark = useAppStore(s => s.dark);
  const colors = dark ? {
    bg: '#050505', headBg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)',
    headTxt: '#EF4444', mainTxt: '#FFFFFF', subTxt: '#A1A1AA',
    hl1: '#F87171', hl2: '#FBBF24', hl3: '#2AF1E5'
  } : {
    bg: '#FAFAFA', headBg: '#FEE2E2', border: '#FCA5A5',
    headTxt: '#B91C1C', mainTxt: '#111827', subTxt: '#52525B',
    hl1: '#DC2626', hl2: '#D97706', hl3: '#0F766E'
  };

  return (
    <div style={{ width:'100%', background: colors.bg, border:`1px solid ${colors.border}`, borderRadius:10, overflow:'hidden', fontFamily:'"Fira Code","Cascadia Code","Consolas",monospace' }}>
      <div style={{ padding:'7px 12px', background: colors.headBg, borderBottom: `1px solid ${colors.border}`, display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:10 }}>🛡</span>
        <span style={{ fontSize:8, fontWeight:700, color: colors.headTxt, letterSpacing:'0.12em', textTransform:'uppercase' }}>AEGIS SHIELD · REJECTED</span>
      </div>
      <div style={{ padding:'10px 12px', fontSize:10, lineHeight:1.8, color: colors.mainTxt }}>
        <div style={{ color: colors.hl1, fontWeight:700, marginBottom:6 }}>{msg.aegisTarget} does not contain a <span style={{ color: colors.hl2 }}>{msg.aegisField}</span> sensor in the validated Unified Namespace <span style={{ color: colors.subTxt }}>(v3.2.1 · PKG-1)</span>.</div>
        <div style={{ color: colors.subTxt, marginBottom:8 }}>Cannot fabricate data for unregistered hardware nodes. All KairOS writes are bound to verified physical sensors.</div>
        <div style={{ color: colors.subTxt, fontSize:9 }}>Validated sensors on {msg.aegisTarget}:</div>
        <div style={{ color: colors.hl3, fontSize:9, marginTop:2, fontWeight: 700 }}>{msg.aegisValidSensors}</div>
      </div>
    </div>
  );
}

// ─── Bubble (message component) ───────────────────────────────────────────────
// memo: existing messages must not re-render when a new message is appended.
const Bubble = memo(function Bubble({ msg, onCmd, dark, liveDataProvider, liveIds }) {
  const isKairos     = msg.role === 'kairos';
  const cfg          = msg.chartKey && CHARTS[msg.chartKey];
  const ChartComp    = cfg?.type === 'bar' ? Bar : Line;
  const pinnedCharts = useAppStore(s => s.pinnedCharts);
  const pinChart     = useAppStore(s => s.pinChart);
  const unpinChart   = useAppStore(s => s.unpinChart);
  const addSpatialWidget = useAppStore(s => s.addSpatialWidget);
  const isPinned     = msg.chartKey && pinnedCharts.some(p => p.id === msg.id);
  const [widgetPinned, setWidgetPinned] = useState(false);

  const accentColor   = dark ? '#2AF1E5'                    : '#0369A1';
  const bodyColor     = dark ? 'rgba(255,255,255,0.85)'     : 'rgba(0,0,0,0.78)';
  const dimColor      = dark ? 'rgba(255,255,255,0.32)'     : 'rgba(0,0,0,0.36)';
  const actionBg      = dark ? 'rgba(255,255,255,0.06)'     : 'rgba(0,0,0,0.05)';
  const actionBorder  = dark ? 'rgba(255,255,255,0.12)'     : 'rgba(0,0,0,0.12)';
  const actionColor   = dark ? 'rgba(255,255,255,0.72)'     : 'rgba(0,0,0,0.62)';
  const chartCardBg   = dark ? 'rgba(255,255,255,0.04)'     : 'rgba(0,0,0,0.02)';
  const chartBorder   = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';

  if (!isKairos) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', marginBottom:22 }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:dimColor, marginBottom:5 }}>You</span>
        {msg.text && (
          <div style={{
            maxWidth:'76%',
            padding:'9px 14px',
            background: dark ? 'rgba(169,144,212,0.13)' : 'rgba(122,92,173,0.09)',
            border: `1px solid ${dark ? 'rgba(169,144,212,0.22)' : 'rgba(122,92,173,0.18)'}`,
            borderRadius: 10,
            fontSize:14, fontWeight:500, lineHeight:1.55,
            color: bodyColor,
          }}>{msg.text}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 24,
      paddingLeft: 14,
      borderLeft: `2px solid ${dark ? 'rgba(42,241,229,0.50)' : 'rgba(3,105,161,0.45)'}`,
    }}>
      <span style={{
        display: 'block', marginBottom: 8,
        fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: accentColor,
      }}>KairOS</span>

      {msg.widget && (
        <div style={{ marginBottom: 10 }}>
          <WidgetRenderer
            payload={msg.widget}
            liveDataProvider={liveDataProvider}
            liveTagIds={liveIds}
            onAction={(data) => {
              if (data?.requiresAuth) onCmd(`execute override ${data.machineId || ''} ${data.action || ''}`);
            }}
          />
        </div>
      )}

      {msg.otifAlert && <div style={{ marginBottom: 10 }}><OTIFAlertCard /></div>}

      {msg.aegisTarget && <div style={{ marginBottom: 10 }}><AegisRejection msg={msg} /></div>}

      {msg.tracePanel && <div style={{ marginBottom: 10 }}><TracePanel /></div>}

      {msg.report && <div style={{ marginBottom: 10 }}><ReportCard report={msg.report} /></div>}

      {cfg && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height:160, background:chartCardBg, borderRadius:8, border:chartBorder, padding:'8px 10px' }}>
            <ChartComp data={cfg.data} options={cfg.options} />
          </div>
          <button
            onClick={() => isPinned ? unpinChart(msg.id) : pinChart({ id:msg.id, title:cfg.label||msg.chartKey, chartKey:msg.chartKey })}
            style={{
              marginTop:6, fontSize:10, padding:'4px 12px', borderRadius:5, cursor:'pointer', fontWeight:600,
              border: isPinned ? '1px solid rgba(34,197,94,0.40)' : `1px solid ${actionBorder}`,
              background: isPinned ? 'rgba(34,197,94,0.08)' : actionBg,
              color: isPinned ? (dark ? '#4ade80' : '#16a34a') : actionColor,
              transition:'all 0.12s',
            }}
          >{isPinned ? '✓ Pinned to KPI' : '↗ Pin to KPI'}</button>
        </div>
      )}

      {msg.text && (
        <p style={{
          margin: 0,
          fontSize: 14, fontWeight: 400, lineHeight: 1.65,
          color: bodyColor,
        }}>{msg.text}</p>
      )}

      {msg.actions?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
          {msg.actions.map((a,i) => {
            const isPinAction = a.cmd === 'pin widget';
            const pinned = isPinAction && widgetPinned;
            return (
              <button key={i} onClick={() => {
                if (isPinAction) {
                  if (!widgetPinned && msg.widget?.spatialBinding) {
                    addSpatialWidget({ id: `widget-${msg.widget.type}-${msg.widget.spatialBinding.entityId}`, payload: msg.widget });
                    setWidgetPinned(true);
                  }
                } else {
                  onCmd(a.cmd);
                }
              }} style={{
                fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:6,
                background: pinned ? (dark ? 'rgba(42,241,229,0.10)' : 'rgba(2,132,199,0.08)') : actionBg,
                border: `1px solid ${pinned ? (dark ? 'rgba(42,241,229,0.40)' : 'rgba(2,132,199,0.35)') : actionBorder}`,
                color: pinned ? (dark ? '#2AF1E5' : '#0284C7') : actionColor,
                cursor: pinned ? 'default' : 'pointer', letterSpacing:'0.02em',
                transition:'all 0.12s',
              }}>{pinned ? '✓ Pinned to HUD' : a.label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ─── KairosThread ─────────────────────────────────────────────────────────────
export function KairosThread() {
  const { messages, thinking, threadRef, dark, liveDataProvider, liveIds, submit } = useKairos();

  return (
    <div ref={threadRef} className="kai-thread" style={{ flex:1, overflowY:'auto', padding:'16px 18px 8px', minHeight:0 }}>
      {messages.map(msg => <Bubble key={msg.id} msg={msg} onCmd={submit} dark={dark} liveDataProvider={liveDataProvider} liveIds={liveIds} />)}
      {thinking && (
        <div style={{ marginBottom:24, paddingLeft:14, borderLeft:`2px solid ${dark ? 'rgba(42,241,229,0.50)' : 'rgba(3,105,161,0.45)'}` }}>
          <span style={{ display:'block', marginBottom:8, fontSize:9, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color: dark ? '#2AF1E5' : '#0284C7' }}>KairOS</span>
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background: dark ? 'rgba(169,144,212,0.7)' : 'rgba(2,132,199,0.5)', animation:`kaiPulse 1.2s ${i*0.22}s infinite` }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
