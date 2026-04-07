import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAppStore } from '../store/useAppStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue: '#3B82F6', blueFill: 'rgba(59,130,246,0.15)',
  red:  '#EF4444', redFill:  'rgba(239,68,68,0.15)',
  amber:'#F59E0B', amberFill:'rgba(245,158,11,0.15)',
  green:'#22C55E', greenFill:'rgba(34,197,94,0.15)',
};
const lineOpts = (yLabel) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: true, labels: { color:'rgba(255,255,255,0.55)', font:{ size:10 }, boxWidth:10 } }, tooltip: { mode:'index', intersect:false } },
  scales: {
    x: { grid:{ color:'rgba(255,255,255,0.07)' }, ticks:{ color:'rgba(255,255,255,0.45)', font:{ size:10 } } },
    y: { grid:{ color:'rgba(255,255,255,0.07)' }, ticks:{ color:'rgba(255,255,255,0.45)', font:{ size:10 } },
         title:{ display:!!yLabel, text:yLabel, color:'rgba(255,255,255,0.35)', font:{ size:10 } } },
  },
});

const CHARTS = {
  oee: { type:'line', data:{ labels:['08:00','08:15','08:30','08:45','09:00','09:15'], datasets:[
    { label:'OEE % — Current', data:[91,88,84,81,78,76], borderColor:C.red, backgroundColor:C.redFill, fill:true, tension:0.3, pointRadius:3 },
    { label:'Golden Baseline',  data:[92,93,92,92,92,93], borderColor:C.green, backgroundColor:'transparent', borderDash:[5,3], tension:0.3, pointRadius:0 },
  ]}, options:lineOpts('OEE %') },
  tension: { type:'line', data:{ labels:['08:00','08:10','08:20','08:30','08:40','08:50','09:00'], datasets:[
    { label:'Film Tension (N)', data:[42,41,39,37,35,34,34], borderColor:C.amber, backgroundColor:C.amberFill, fill:true, tension:0.3, pointRadius:3 },
    { label:'Target (42N)',     data:[42,42,42,42,42,42,42], borderColor:'rgba(255,255,255,0.25)', borderDash:[4,3], pointRadius:0 },
  ]}, options:lineOpts('N') },
  planned: { type:'bar', data:{ labels:['08:00','08:30','09:00','09:30','10:00'], datasets:[
    { label:'Planned', data:[600,1200,1800,2400,3000], backgroundColor:'rgba(59,130,246,0.5)', borderRadius:3 },
    { label:'Actual',  data:[598,1150,1120,null,null],  backgroundColor:'rgba(239,68,68,0.55)', borderRadius:3 },
  ]}, options:{ ...lineOpts('Units'), plugins:{ legend:{ display:true, labels:{ color:'rgba(255,255,255,0.55)', font:{ size:10 }, boxWidth:10 } } } } },
  reject: { type:'line', data:{ labels:['08:00','08:15','08:30','08:45','09:00'], datasets:[
    { label:'Reject Rate %', data:[1.4,1.8,2.9,3.8,4.2], borderColor:C.red, backgroundColor:C.redFill, fill:true, tension:0.3, pointRadius:3 },
    { label:'Limit (1.5%)',  data:[1.5,1.5,1.5,1.5,1.5], borderColor:C.amber, borderDash:[4,3], pointRadius:0 },
  ]}, options:lineOpts('%') },
  golden: { type:'bar', data:{ labels:['OEE %','Speed (bpm ÷ 3)','Output (÷ 50)'], datasets:[
    { label:'Golden PH-2025-088',  data:[92.4,80,96],    backgroundColor:'rgba(34,197,94,0.5)',  borderRadius:3 },
    { label:'Current PH-2026-018', data:[78.4,72.7,22.4], backgroundColor:'rgba(239,68,68,0.5)', borderRadius:3 },
  ]}, options:{ ...lineOpts('Value'), plugins:{ legend:{ display:true, labels:{ color:'rgba(255,255,255,0.55)', font:{ size:10 }, boxWidth:10 } } } } },
  speed: { type:'line', data:{ labels:['08:00','08:10','08:20','08:30','08:40','08:50','09:00'], datasets:[
    { label:'Blister Speed (bpm)', data:[240,240,235,224,219,218,218], borderColor:C.amber, backgroundColor:C.amberFill, fill:true, tension:0.3, pointRadius:3 },
    { label:'Setpoint (240 bpm)',  data:[240,240,240,240,240,240,240], borderColor:'rgba(255,255,255,0.25)', borderDash:[4,3], pointRadius:0 },
  ]}, options:lineOpts('bpm') },
};

// ─── Knowledge ────────────────────────────────────────────────────────────────
const KNOWLEDGE = [
  { match:['oee','overall equipment','oee by batch','batch oee','78','performance'],
    response:'OEE on Batch PH-2026-018 is running at 78.4% — down from the 92.4% golden batch baseline. The primary driver is 23 minutes of hidden micro-stop loss on CT-1101 sitting below the 2-minute OEE logging threshold, so it never shows up in standard downtime reports.',
    focusIds:['batch_current','planned_vs_actual','hidden_loss'], chartKey:'oee',
    actions:[{ label:'→ Show hidden loss', cmd:'show drift path' },{ label:'→ Root cause', cmd:'isolate root cause' }] },
  { match:['blister','bm-1101','bm1101','blister machine','speed','218','240','bpm'],
    response:'BM-1101 blister machine is running at 218 bpm — 9.2% below the 240 bpm setpoint. The PLC auto-reduced speed at 08:14 in response to film tension dropping to 34N. Root cause of OEE loss at 83% confidence.',
    focusIds:['blister_machine','film_tension','blister_speed'], chartKey:'speed',
    actions:[{ label:'→ Show drift path', cmd:'show drift path' }] },
  { match:['planned','actual','output','target','shift target','miss','behind','gap','1840','2200','units'],
    response:'Current output gap is 1,840 units behind plan as of 09:02, widening at 2.3 units per minute. Shift B will miss its target by approximately 2,200 units — a £34,000 shift value impact.',
    focusIds:['planned_vs_actual','impact_yield'], chartKey:'planned',
    actions:[{ label:'→ Simulate correction', cmd:'simulate correction' },{ label:'→ Show value at risk', cmd:'compare to golden batch' }] },
  { match:['film tension','tension','roller','42n','34n','forming','tension drift'],
    response:'Root cause confirmed at 83% confidence: film tension on BM-1101 has drifted from 42N to 34N since 08:14. A 4-minute tension roller adjustment will restore BM-1101 to 240 bpm and stop the output gap widening.',
    focusIds:['film_tension','blister_machine','blister_speed'], chartKey:'tension',
    actions:[{ label:'→ Simulate correction', cmd:'simulate correction' }] },
  { match:['reject','vision','vi-1101','reject rate','4.2','incomplete'],
    response:'Vision system VI-1101 is rejecting 4.2% of packs — 2.8× above the 1.5% limit. Root cause is incomplete blister forming from the film tension fault. 77 units rejected and quarantined since 08:14.',
    focusIds:['reject_count','blister_machine','film_tension'], chartKey:'reject',
    actions:[{ label:'→ Show quality impact', cmd:'explain deviation' }] },
  { match:['compare','golden batch','golden','reference','baseline','ph-2025'],
    response:'Golden batch PH-2025-088 ran at 92.4% OEE with 4,800 units on Shift B. Current batch PH-2026-018 is at 78.4% OEE — a 14-point gap entirely explained by 23 minutes of hidden micro-stop loss.',
    focusIds:['batch_golden','batch_current','blister_speed'], chartKey:'golden',
    actions:[{ label:'→ Show drift path', cmd:'show drift path' },{ label:'→ Simulate correction', cmd:'simulate correction' }] },
  { match:['cartoner','ct-1101','micro-jam','jam','starv'],
    response:'CT-1101 cartoner has logged 11 micro-jams since 08:31 — each lasting under 2 minutes, so none triggered a formal downtime event. Starved by BM-1101 running 22 bpm slow.',
    focusIds:['cartoner','hidden_loss','blister_machine'],
    actions:[{ label:'→ Show hidden loss', cmd:'show drift path' }] },
  { match:['serial','serialization','sz-1101','queue','traceability','patient safety'],
    response:'Serialization queue at SZ-1101 has 340 unverified units — above the 200-unit safety threshold. Patient safety risk if batch closes without reconciliation.',
    focusIds:['serialization_queue','sys_qa'],
    actions:[{ label:'→ Show compliance impact', cmd:'show affected systems' }] },
  { match:['batch status','batch summary','ph-2026','lisinopril','sku'],
    response:'Batch PH-2026-018 · SKU 41829 (Lisinopril 10mg 28-pack) · Shift B · Operator: K. Mueller. 1,840 units behind plan with OEE at 78.4%. Can recover with film tension correction in the next 15 min.',
    focusIds:['batch_current','planned_vs_actual'],
    actions:[{ label:'→ Simulate correction', cmd:'simulate correction' }] },
];
const FALLBACK = {
  response:'I can help you investigate this incident. Ask about film tension drift, blister speed, hidden OEE loss, shift target gap, or serialization queue.',
  focusIds:['hidden_loss'], actions:[{ label:'→ Explain deviation', cmd:'explain deviation' }],
};
const GRAPH_CMDS = ['drift path','root cause','simulate correction','explain deviation','show affected systems','cross line','golden batch','tension impact','hidden loss','micro-stop'];

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
    type:'BATCH', pill:'batch', title:'Batch Record — PH-2026-018',
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
    type:'SHIFT', pill:'shift', title:'Shift Handover — Shift B → C',
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
    type:'DEVIATION', pill:'deviation', title:'Deviation Report — OEE-2026-031',
    meta:['Batch PH-2026-018','Line 1','Shift B', ts],
    sections:[
      { label:'Incident Summary', text:`Film tension drifted from 42N to ${tN}N. BM-1101 auto-reduced to ${sN} bpm. CT-1101 logged 11 micro-jams.` },
      { label:'Root Cause', text:'Film tension drift at FT-1101, 83% confidence.' },
      { label:'Recommended Action', text:`Adjust tension roller to 42N. Recovery: 12 min, 94% confidence. QA sign-off required.` },
    ],
    table:[
      { tag:'FT-1101', name:'Film Tension',  current:`${tN}N`,      target:'42N',        status: tN < 40 ? 'warning' : 'ok' },
      { tag:'BM-1101', name:'Blister Speed', current:`${sN} bpm`,  target:'240 bpm',    status: sN < 230 ? 'warning' : 'ok' },
      { tag:'VI-1101', name:'Reject Rate',   current:'4.2%',     target:'1.5% limit', status:'critical' },
      { tag:'SZ-1101', name:'Serial Queue',  current:'340 units',target:'<200',       status:'warning' },
    ],
  };
}

// ─── Message component ────────────────────────────────────────────────────────
function Bubble({ msg, onCmd }) {
  const isKairos = msg.role === 'kairos';
  const cfg = msg.chartKey && CHARTS[msg.chartKey];
  const ChartComp = cfg?.type === 'bar' ? Bar : Line;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isKairos ? 'flex-start' : 'flex-end', gap:6, marginBottom:12 }}>
      {/* Report */}
      {msg.report && (() => {
        const ps = pillStyle[msg.report.pill];
        return (
          <div style={{ width:'100%', background:'rgba(255,255,255,0.95)', borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', overflow:'hidden', fontSize:11.5, color:'#111' }}>
            <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
              <div>
                <div style={{ display:'inline-flex', fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', padding:'2px 6px', borderRadius:3, marginBottom:3, background:ps.bg, color:ps.color, border:`1px solid ${ps.border}` }}>{msg.report.type}</div>
                <div style={{ fontSize:13, fontWeight:700 }}>{msg.report.title}</div>
                <div style={{ fontSize:10, color:'#6b7280', display:'flex', flexWrap:'wrap', gap:6, marginTop:2 }}>
                  {msg.report.meta.map((m,i) => <span key={i}>{i>0?'· ':''}{m}</span>)}
                </div>
              </div>
              <button onClick={() => {
                const w = window.open('', '_blank', 'width=820,height=680');
                w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${msg.report.title}</title><style>body{font-family:system-ui,sans-serif;padding:28px;font-size:12px;color:#111;}table{width:100%;border-collapse:collapse;}th,td{padding:5px 8px;text-align:left;border-bottom:1px solid #e5e7eb;}th{font-size:9px;text-transform:uppercase;color:#6b7280;}h2{margin:0 0 4px;font-size:15px;}p{margin:6px 0;line-height:1.6;}.pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;border-radius:3px;margin-bottom:4px;}</style></head><body><div class="pill" style="background:${ps.bg};color:${ps.color};border:1px solid ${ps.border}">${msg.report.type}</div><h2>${msg.report.title}</h2><p style="font-size:10px;color:#6b7280">${msg.report.meta.join(' · ')}</p>${msg.report.sections.map(s=>`<p><strong>${s.label}:</strong> ${s.text}</p>`).join('')}<table><thead><tr><th>Tag</th><th>Parameter</th><th>Current</th><th>Target</th><th>Status</th></tr></thead><tbody>${msg.report.table.map(r=>`<tr><td style="font-family:monospace;color:#1d4ed8;font-weight:700">${r.tag}</td><td>${r.name}</td><td style="color:${statusColor[r.status]||'#111'};font-weight:600">${r.current}</td><td style="color:#6b7280">${r.target}</td><td style="color:${statusColor[r.status]||'#111'};font-weight:600;text-transform:capitalize">${r.status}</td></tr>`).join('')}</tbody></table></body></html>`);
                w.document.close(); setTimeout(() => w.print(), 300);
              }} style={{ fontSize:10, padding:'3px 8px', border:'1px solid rgba(0,0,0,0.12)', borderRadius:4, background:'#fff', cursor:'pointer', color:'#374151', flexShrink:0 }}>Print</button>
            </div>
            <div style={{ padding:'8px 14px 10px', display:'flex', flexDirection:'column', gap:8 }}>
              {msg.report.sections.map((s,i) => (
                <div key={i}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'#6b7280', marginBottom:2 }}>{s.label}</div>
                  <div style={{ lineHeight:1.6, color:'#1f2937' }}>{s.text}</div>
                </div>
              ))}
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Tag','Parameter','Current','Target','Status'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'4px 6px', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid rgba(0,0,0,0.08)' }}>{h}</th>
                ))}</tr></thead>
                <tbody>{msg.report.table.map((r,i)=>(
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
      })()}

      {/* Text bubble */}
      {msg.text && (
        <div style={{
          maxWidth:'88%',
          background: isKairos ? 'rgba(255,255,255,0.10)' : 'rgba(122,92,173,0.35)',
          border: isKairos ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(122,92,173,0.5)',
          borderRadius: isKairos ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
          padding:'9px 12px', fontSize:13, lineHeight:1.55, color:'rgba(255,255,255,0.88)',
        }}>{msg.text}</div>
      )}

      {/* Chart */}
      {cfg && (
        <div style={{ width:'100%', height:160, background:'rgba(255,255,255,0.08)', borderRadius:10, border:'1px solid rgba(255,255,255,0.10)', padding:'8px 10px', marginTop:2 }}>
          <ChartComp data={cfg.data} options={cfg.options} />
        </div>
      )}

      {/* Actions */}
      {msg.actions?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {msg.actions.map((a,i) => (
            <button key={i} onClick={() => onCmd(a.cmd)} style={{
              fontSize:11, padding:'4px 10px', borderRadius:20,
              border:'1px solid rgba(122,92,173,0.5)', background:'rgba(122,92,173,0.15)',
              color:'#A990D4', cursor:'pointer', fontWeight:600,
            }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick chips ──────────────────────────────────────────────────────────────
const QUICK = [
  { label:'OEE status',          cmd:'show me oee by batch' },
  { label:'Film tension',        cmd:'film tension drift' },
  { label:'vs Golden batch',     cmd:'compare to golden batch' },
  { label:'Output gap',          cmd:'show me planned vs actual' },
  { label:'Incident report',     cmd:'generate incident report' },
  { label:'Batch record',        cmd:'generate batch report' },
  { label:'Shift handover',      cmd:'generate shift report' },
];

let _msgId = 0;
const mkMsg = (role, data) => ({ id: ++_msgId, role, ...data });

// ─── Main Component ───────────────────────────────────────────────────────────
export const KairOSOverlay = () => {
  const kairosOpen     = useAppStore(s => s.kairosOpen);
  const kairosEntityId = useAppStore(s => s.kairosEntityId);
  const entityMap      = useAppStore(s => s.entityMap);
  const closeKairos    = useAppStore(s => s.closeKairos);
  const openKairos     = useAppStore(s => s.openKairos);
  const enterFocus     = useAppStore(s => s.enterFocus);

  const [messages, setMessages] = useState([
    mkMsg('kairos', { text:'Film tension drift on BM-1101 is starving the line — 23 min hidden micro-stop loss unlogged. Root cause probability 83%. Ask me anything or use a quick command below.', actions:[] }),
  ]);
  const [input, setInput]       = useState('');
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef(null);
  const inputRef  = useRef(null);

  // ─── Callbacks (DEFINED FIRST to avoid ReferenceErrors) ─────────────────────
  const detectIntent = useCallback((text) => {
    const t = text.toLowerCase().trim();
    if (t.includes('generate') || t.includes('report') || t.includes('gen ')) return 'report';
    if (GRAPH_CMDS.some(c => t.includes(c))) return 'command';
    return 'question';
  }, []);

  const handleReport = useCallback((text) => {
    const t = text.toLowerCase();
    let type = 'incident';
    if (t.includes('batch') || t.includes('bpr') || t.includes('record')) type = 'batch';
    else if (t.includes('shift') || t.includes('handover')) type = 'shift';
    const ts = new Date().toLocaleString('en-IE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, mkMsg('kairos', { report: buildReport(type, ts, entityMap), actions: [] })]);
  }, [entityMap]);

  const handleCommand = useCallback((text) => {
    const t = text.toLowerCase();
    let focusId = 'hidden_loss';
    if (t.includes('focus ')) focusId = t.replace('focus ', '').trim();
    else if (t.includes('root cause')) focusId = 'film_tension';
    else if (t.includes('correction') || t.includes('corrected')) focusId = 'sim_corrected';
    else if (t.includes('affected') || t.includes('systems')) focusId = 'impact_yield';
    else if (t.includes('golden')) focusId = 'batch_golden';
    else if (t.includes('deviation') || t.includes('explain')) focusId = 'reject_count';
    else if (t.includes('drift path')) focusId = 'film_tension';
    enterFocus(focusId);
    setMessages(prev => [...prev, mkMsg('kairos', { text: `Graph updated — focusing on ${focusId.replace(/_/g, ' ')}.`, actions: [] })]);
  }, [enterFocus]);

  const handleQuestion = useCallback((text) => {
    const t = text.toLowerCase();
    let best = null, bestScore = 0;
    for (const entry of KNOWLEDGE) {
      const score = entry.match.reduce((acc, kw) => acc + (t.includes(kw) ? (kw.includes(' ') ? 3 : 1) : 0), 0);
      if (score > bestScore) { best = entry; bestScore = score; }
    }
    const r = best || FALLBACK;
    if (r.focusIds?.length) enterFocus(r.focusIds[0]);
    setMessages(prev => [...prev, mkMsg('kairos', { text: r.response, chartKey: r.chartKey, actions: r.actions })]);
  }, [enterFocus]);

  const submit = useCallback((text) => {
    const t = text.trim();
    if (!t) return;
    setInput('');
    setMessages(prev => [...prev, mkMsg('user', { text: t, actions: [] })]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      const intent = detectIntent(t);
      if (intent === 'report') handleReport(t);
      else if (intent === 'command') handleCommand(t);
      else handleQuestion(t);
    }, 380);
  }, [detectIntent, handleReport, handleCommand, handleQuestion]);

  // ─── Effects (HOOKS LATER) ──────────────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (!kairosOpen || !kairosEntityId) return;
    const e = entityMap[kairosEntityId];
    if (!e) return;
    setMessages(prev => [...prev, mkMsg('kairos', {
      text: `${e.label} — ${e.metadata?.detail || e.insight || 'No detail available.'}`,
      actions: e.action ? [{ label: `→ ${e.action}`, cmd: `focus ${kairosEntityId}` }] : [],
    })]);
  }, [kairosEntityId, entityMap, kairosOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.detail) submit(e.detail); };
    window.addEventListener('kairos-cmd', handler);
    return () => window.removeEventListener('kairos-cmd', handler);
  }, [submit]);

  return (
    <>
      <style>{`
        @keyframes kaiPulse {
          0%,80%,100% { opacity:0.25; transform:scale(0.85); }
          40%          { opacity:1;   transform:scale(1.1); }
        }
      `}</style>

      {/* Orb */}
      <button onClick={() => kairosOpen ? closeKairos() : openKairos()} style={{
        position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)',
        width:48, height:48, borderRadius:'50%', border:'none',
        background:'linear-gradient(135deg, #7A5CAD 0%, #4A5AA8 100%)',
        boxShadow:'0 4px 20px rgba(122,92,173,0.4)',
        cursor:'pointer', zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:20, color:'white',
      }}>✦</button>

      <AnimatePresence>
        {kairosOpen && (
          <motion.div
            initial={{ opacity:0, y:20, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:20, scale:0.95 }}
            transition={{ type:'spring', stiffness:380, damping:28 }}
            style={{
              position:'fixed', bottom:96, left:'50%', transform:'translateX(-50%)',
              width:440, maxHeight:'70vh',
              display:'flex', flexDirection:'column',
              background:'rgba(14,20,32,0.94)',
              backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
              border:'1px solid rgba(255,255,255,0.11)',
              borderRadius:16,
              boxShadow:'0 1px 0 0 rgba(255,255,255,0.12) inset, 0 24px 64px rgba(0,0,0,0.50)',
              zIndex:199, overflow:'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding:'12px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#7A5CAD', boxShadow:'0 0 6px #7A5CAD' }} />
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#A990D4' }}>KairOS</span>
              </div>
              <button onClick={closeKairos} style={{ border:'none', background:'none', cursor:'pointer', fontSize:16, color:'rgba(255,255,255,0.40)', lineHeight:1 }}>×</button>
            </div>

            {/* Thread */}
            <div ref={threadRef} style={{ flex:1, overflowY:'auto', padding:'14px 16px 8px', minHeight:0 }}>
              {messages.map(msg => <Bubble key={msg.id} msg={msg} onCmd={submit} />)}
              {thinking && (
                <div style={{ display:'flex', gap:4, padding:'9px 12px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'4px 12px 12px 12px', width:'fit-content', marginBottom:12 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#7A5CAD', animation:`kaiPulse 1.2s ${i*0.2}s infinite` }} />)}
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div style={{ padding:'6px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
              {QUICK.map((q,i) => (
                <button key={i} onClick={() => submit(q.cmd)} style={{
                  fontSize:11, padding:'4px 10px', borderRadius:20,
                  border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
                  color:'rgba(255,255,255,0.60)', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontWeight:500,
                }}>{q.label}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:8, flexShrink:0 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); } }}
                placeholder="Ask a question or type a command…"
                style={{
                  flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:8, padding:'8px 12px', fontSize:13, color:'rgba(255,255,255,0.88)', outline:'none',
                }}
              />
              <button onClick={() => submit(input)} style={{
                background:'#7A5CAD', border:'none', borderRadius:8, padding:'8px 14px',
                fontSize:13, color:'#fff', cursor:'pointer', fontWeight:600,
              }}>↑</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
