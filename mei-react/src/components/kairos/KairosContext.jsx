import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { detectIntent, KNOWLEDGE, FALLBACK, resolveMachineId } from '../../lib/kairosIntent';
import { buildWidgetPayload } from '../../lib/widgetFactory';

// ─── Message helpers ──────────────────────────────────────────────────────────
let _msgId = 0;
export const mkMsg = (role, data) => ({ id: ++_msgId, role, ...data });

export function mkLogEntry(type, text) {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  return { id: `ov-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, ts, type, text };
}

export function stageLog(addFn, entries) {
  entries.forEach(([delay, type, text]) => {
    setTimeout(() => addFn(mkLogEntry(type, text)), delay);
  });
}

// ─── Widget presets — used for composable panel modification ──────────────────
const WIDGET_PRESETS = {
  gauge:   { type:'gauge',   confidence:0.94, props:{ value:78.4, max:100, label:'OEE · BM-1101', unit:'%', warnAt:85, critAt:70 } },
  oee:     { type:'gauge',   confidence:0.94, props:{ value:78.4, max:100, label:'OEE · BM-1101', unit:'%', warnAt:85, critAt:70 } },
  stat:    { type:'stat',    confidence:0.91, props:{ label:'Throughput', value:'312', unit:'u/min' } },
  speed:   { type:'stat',    confidence:0.91, props:{ label:'Speed', value:'218', unit:'bpm', delta:-6, deltaLabel:'vs target' } },
  rejects: { type:'stat',    confidence:0.91, props:{ label:'Rejects', value:'14', unit:'/hr', delta:8, deltaLabel:'vs 1h ago' } },
  chart:   { type:'chart',   confidence:0.91, props:{ chartType:'line', label:'Film Tension · FT-1101', unit:'N', height:90, datasets:[{ label:'FT-1101', data:[42,41.8,41.2,40.5,39.8,38.4,37.1,36.0,35.2,34.8], color:'#F59E0B', fill:false }], labels:['08:10','08:18','08:26','08:34','08:42','08:46','08:50','08:52','08:54','08:56'] } },
  trend:   { type:'chart',   confidence:0.91, props:{ chartType:'line', label:'Film Tension · FT-1101', unit:'N', height:90, datasets:[{ label:'FT-1101', data:[42,41.8,41.2,40.5,39.8,38.4,37.1,36.0,35.2,34.8], color:'#F59E0B', fill:false }], labels:['08:10','08:18','08:26','08:34','08:42','08:46','08:50','08:52','08:54','08:56'] } },
  table:   { type:'table',   confidence:0.89, props:{ title:'Line Status', columns:['Line','OEE','Speed','Status'], statusCol:'Status', rows:[{ Line:'L1 · BM-1101', OEE:'78.4%', Speed:'218 bpm', Status:'warning' },{ Line:'L2 · BM-1201', OEE:'93.4%', Speed:'224 bpm', Status:'ok' }] } },
  action:  { type:'action',  confidence:0.97, props:{ label:'Apply Tension Correction → 42 N', action:'adjust_tension_ft1101', machineId:'bf_1101', risk:'medium' } },
  slider:  { type:'control', confidence:0.88, props:{ controlType:'slider', label:'Tension Setpoint · FT-1101', value:42, min:20, max:60, step:0.5, unit:'N', action:'set_tension_ft1101', machineId:'bf_1101' } },
  switch:  { type:'control', confidence:0.90, props:{ controlType:'switch', label:'Auto-Speed Correction · BM-1101', value:false, action:'toggle_auto_correct', machineId:'bf_1101' } },
};

// ─── Context ──────────────────────────────────────────────────────────────────
export const KairosContext = React.createContext(null);

export function KairosProvider({ children }) {
  const kairosOpen        = useAppStore(s => s.kairosOpen);
  const kairosEntityId    = useAppStore(s => s.kairosEntityId);
  const entityMap         = useAppStore(s => s.entityMap);
  const enterFocus        = useAppStore(s => s.enterFocus);
  const setMachineOffline = useAppStore(s => s.setMachineOffline);
  const setMachineOnline  = useAppStore(s => s.setMachineOnline);
  const clearOffline      = useAppStore(s => s.clearOffline);
  const openOnboarding    = useAppStore(s => s.openOnboarding);
  const dark              = useAppStore(s => s.dark);
  const addActionLog      = useAppStore(s => s.addActionLog);
  const addSpatialWidget  = useAppStore(s => s.addSpatialWidget);
  const entityPhysics     = useAppStore(s => s.entityPhysics);
  const liveIds           = useAppStore(s => s.liveIds);

  // DI boundary: the only place in the widget pipeline that knows about the store.
  const liveDataProvider = useCallback(
    (tag) => entityPhysics?.[tag]?.currentValue,
    [entityPhysics]
  );

  const [messages, setMessages] = useState([
    mkMsg('kairos', { text:'Film tension drift on BM-1101 is starving the line — 23 min hidden micro-stop loss unlogged. Root cause probability 96%. Ask me anything or use a quick command below.', actions:[] }),
    mkMsg('kairos', {
      otifAlert: true,
      text:'Line 1 will miss the Friday 17:00 SAP delivery target if BM-1101 is not corrected — physics engine projects a 2,200-unit shortfall at batch close.',
      actions:[
        { label:'→ Simulate correction', cmd:'simulate correction' },
        { label:'→ OTIF details',        cmd:'otif delivery risk friday' },
      ],
    }),
  ]);
  const [input, setInput]               = useState('');
  const [thinking, setThinking]         = useState(false);
  const [currentPanel, setCurrentPanel] = useState(null);
  const [cfrPending, setCfrPending]     = useState(null);
  const [cfrPin, setCfrPin]             = useState('');
  const [cfrError, setCfrError]         = useState(false);

  const threadRef = useRef(null);
  const inputRef  = useRef(null);

  // ─── Inner handlers ──────────────────────────────────────────────────────────
  const handleReport = useCallback((text) => {
    const t = text.toLowerCase();
    let type = 'incident';
    if (t.includes('batch') || t.includes('bpr') || t.includes('record')) type = 'batch';
    else if (t.includes('shift') || t.includes('handover')) type = 'shift';
    const ts = new Date().toLocaleString('en-IE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // buildReport is defined in KairosThread and operates on entityMap — re-implement inline here
    // to avoid circular dep. We duplicate the minimal part needed by the provider.
    const _v = (ent, key, fb) => {
      const n = Object.values(ent || {}).find(x => x.id.includes(key) || (x.label && x.label.toLowerCase().includes(key)));
      return n && n.metricValue !== undefined ? n.metricValue : fb;
    };
    const oeeN = _v(entityMap, 'oee', 78.4);
    const sN   = _v(entityMap, 'blister', 218);
    const tN   = _v(entityMap, 'tension', 34);

    let report;
    if (type === 'batch') {
      report = {
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
    } else if (type === 'shift') {
      report = {
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
    } else {
      report = {
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
    setMessages(prev => [...prev, mkMsg('kairos', { report, actions: [] })]);
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

  const handleOfflineSim = useCallback((text) => {
    const t = text.toLowerCase();
    const machineId = resolveMachineId(t);
    if (!machineId) return;
    const label = machineId.replace('_','-').toUpperCase();
    const isRestore = t.includes('restore') || t.includes('bring back') || t.includes('online') || t.includes('recover');
    if (isRestore) {
      setMachineOnline(machineId);
      setMessages(prev => [...prev, mkMsg('kairos', {
        text: `${label} restored — machine back online. Product flow resuming on the line. Monitor output rate for the next 5 minutes to confirm recovery.`,
        actions: [{ label:'→ Check output gap', cmd:'show me planned vs actual' }],
      })]);
    } else {
      setMachineOffline(machineId);
      setMessages(prev => [...prev, mkMsg('kairos', {
        text: `Simulating ${label} offline. Product flow is now blocked at that station — vials queuing at the machine entrance. Downstream throughput will drop to zero within 90 seconds. Raise a bypass deviation or restore the unit to recover.`,
        actions: [
          { label:`→ Restore ${label}`, cmd:`restore ${machineId.replace('_','-')}` },
          { label:'→ Generate deviation', cmd:'generate incident report' },
        ],
      })]);
    }
  }, [setMachineOffline, setMachineOnline]);

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

  const handlePanelModify = useCallback((text) => {
    const t = text.toLowerCase();
    const isRemove = ['remove','delete','drop','take out','exclude'].some(k => t.includes(k));

    const matchedKey = Object.keys(WIDGET_PRESETS).find(k => t.includes(k));
    const typeMap = { graph:'chart', trend:'chart', tension:'chart', speed:'stat', rejects:'stat', oee:'gauge', control:'control' };
    const resolvedKey = matchedKey || Object.entries(typeMap).find(([kw]) => t.includes(kw))?.[1];

    if (!resolvedKey) {
      setMessages(prev => [...prev, mkMsg('kairos', {
        text: 'I couldn\'t identify which widget to modify. Try: "add gauge", "remove chart", "add action button".',
        actions: [],
      })]);
      return;
    }

    const newPanel = JSON.parse(JSON.stringify(currentPanel));
    if (!Array.isArray(newPanel.children)) newPanel.children = [];

    if (isRemove) {
      const preset = WIDGET_PRESETS[resolvedKey];
      const typeToRemove = preset?.type || resolvedKey;
      const idx = newPanel.children.findIndex(c => c.type === typeToRemove);
      if (idx === -1) {
        setMessages(prev => [...prev, mkMsg('kairos', {
          text: `No ${typeToRemove} widget found in the panel to remove.`,
          actions: [],
        })]);
        return;
      }
      newPanel.children.splice(idx, 1);
    } else {
      const preset = WIDGET_PRESETS[resolvedKey] || WIDGET_PRESETS.gauge;
      newPanel.children.push({ type: preset.type, confidence: preset.confidence, props: { ...preset.props } });
    }

    setCurrentPanel(newPanel);
    const verb = isRemove ? 'removed' : 'added';
    setMessages(prev => [...prev, mkMsg('kairos', {
      text: `Panel updated — ${verb} ${resolvedKey} widget.`,
      widget: newPanel,
      actions: [{ label: '⊞ Pin to HUD', cmd: 'pin widget' }],
    })]);
  }, [currentPanel]);

  const submit = useCallback((text) => {
    const t = text.trim();
    if (!t) return;
    setInput('');
    setMessages(prev => [...prev, mkMsg('user', { text: t, actions: [] })]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      const intent = detectIntent(t, currentPanel);

      if (intent === 'panel_modify') {
        stageLog(addActionLog, [
          [0,   'sys',  'Parsing panel modification intent...'],
          [300, 'sys',  'Mutating widget tree...'],
          [600, 'ok',   'Panel updated · re-rendering'],
        ]);
        handlePanelModify(t);
        return;
      }

      if (intent === 'widget') {
        stageLog(addActionLog, [
          [0,   'sys',  'Querying AEGIS manifest · tag namespace v3.2.1'],
          [280, 'sys',  'LLM inference → widget JSON payload...'],
          [620, 'ok',   'Widget schema validated · mounting component'],
        ]);

        const widget = buildWidgetPayload(t);

        // Register composable panels as active panel for subsequent modification commands
        if (widget.type === 'layout') {
          setCurrentPanel(widget);
        }

        setMessages(prev => [...prev, mkMsg('kairos', {
          text: 'Widget generated from live namespace tags.',
          widget,
          actions: [{ label: '⊞ Pin to HUD', cmd: 'pin widget' }],
        })]);
        return;
      }

      if (intent === 'report') {
        stageLog(addActionLog, [
          [0,   'sys', 'Reading historian tags · batch PH-2026-018'],
          [320, 'sys', 'Fetching OEE metrics · Shift B · Line 1'],
          [700, 'sys', 'Assembling report template...'],
          [1100,'ok',  'Report compiled · ready for export'],
        ]);
        handleReport(t);
      }
      else if (intent === 'command') {
        const focusLabel = t.toLowerCase().includes('root') ? 'film_tension'
          : t.toLowerCase().includes('golden') ? 'batch_golden'
          : 'causal_graph';
        stageLog(addActionLog, [
          [0,   'sys', `Computing causal impact neighborhood...`],
          [400, 'sys', `Resolving focus node: ${focusLabel}`],
          [800, 'ok',  `Graph updated · entity scope resolved`],
        ]);
        handleCommand(t);
      }
      else if (intent === 'onboard') {
        stageLog(addActionLog, [
          [0,   'sys', 'Launching onboarding wizard...'],
          [350, 'sys', 'Scanning local MQTT broker · port 1883'],
          [800, 'sys', 'Listening for EtherCAT discovery packets...'],
          [1400,'info','Awaiting device confirmation from operator'],
        ]);
        setMessages(prev => [...prev, mkMsg('kairos', { text: 'Opening the machine onboarding wizard. You\'ll need the equipment manual, P&IDs, and IQ/OQ protocols ready. The machine won\'t go live until qualification is complete.', actions: [] })]);
        setTimeout(() => openOnboarding(), 400);
      }
      else if (intent === 'offline_sim') {
        const machineId = resolveMachineId(t.toLowerCase());
        const label = machineId ? machineId.replace('_','-').toUpperCase() : 'MACHINE';
        const isRestore = t.toLowerCase().includes('restore') || t.toLowerCase().includes('online');
        if (isRestore) {
          stageLog(addActionLog, [
            [0,   'sys', `Resolving node: ${label}`],
            [300, 'sys', `Injecting NOMINAL state → ${machineId}`],
            [700, 'sys', 'Releasing downstream starvation locks...'],
            [1000,'ok',  `${label} state = ONLINE · flow resumed`],
          ]);
        } else {
          stageLog(addActionLog, [
            [0,   'sys', `Resolving EtherCAT node: ${label}`],
            [350, 'sys', `Querying node status · bus addr 0x${Math.floor(Math.random()*0xFF).toString(16).toUpperCase().padStart(2,'0')}`],
            [750, 'sys', `Injecting OFFLINE state → ${machineId}`],
            [1100,'sys', 'Computing downstream starvation map...'],
            [1500,'warn', `${label} OFFLINE · product flow BLOCKED`],
          ]);
        }
        handleOfflineSim(t);
      }
      else if (intent === 'offline_clear') {
        stageLog(addActionLog, [
          [0,  'sys', 'Clearing all offline flags across bus...'],
          [400,'sys', 'Restoring nominal state on all nodes...'],
          [800,'ok',  'All machines = NOMINAL · flow resumed'],
        ]);
        clearOffline();
        setMessages(prev => [...prev, mkMsg('kairos', { text: 'All machines restored to operational state. Product flow resuming across all lines.', actions: [] })]);
      }
      else if (intent === 'trace') {
        stageLog(addActionLog, [
          [0,   'sys', 'Resolving prediction anchor chain...'],
          [300, 'sys', 'Querying FT-1101 · Modbus 10.0.0.12:502'],
          [700, 'ok',  'Anchor verified · register 40001 · 34.0N'],
        ]);
        setMessages(prev => [...prev, mkMsg('kairos', {
          text: 'Prediction anchored to 34.0N live reading from Modbus Node 10.0.0.12. Every inference KairOS makes is shackled to a verified physical sensor in the Unified Namespace.',
          tracePanel: true,
          actions: [],
        })]);
      }
      else if (intent === 'aegis') {
        stageLog(addActionLog, [
          [0,   'warn', 'Fabrication attempt intercepted · AEGIS active'],
          [400, 'err',  'Request rejected · sensor not in namespace'],
        ]);
        setMessages(prev => [...prev, mkMsg('kairos', {
          aegisTarget: 'CT-1101 Cartoner',
          aegisField: 'temperature',
          aegisValidSensors: 'pack_rate [AI] · jam_count [AI] · run_status [DI]',
          actions: [],
        })]);
      }
      else if (intent === 'cfr_block') {
        const machineId = resolveMachineId(t) || 'bf_1101';
        const label = machineId.replace('_','-').toUpperCase();
        stageLog(addActionLog, [
          [0,   'warn', `PLC write requested · ${label} → OFFLINE`],
          [300, 'warn', '21 CFR Part 11 gate triggered · awaiting human auth'],
        ]);
        setMessages(prev => [...prev, mkMsg('kairos', {
          text: `Override command intercepted. BM-1101 cannot be taken offline without operator authorization — 21 CFR Part 11 requires a signed audit record before any PLC write. Authorization modal requires your operator PIN.`,
          actions: [],
        })]);
        setTimeout(() => setCfrPending({ label, machineId }), 500);
      }
      else {
        stageLog(addActionLog, [
          [0,   'sys', 'Parsing query intent...'],
          [400, 'sys', 'Scoring knowledge base entries...'],
          [700, 'info','Response generated · no write actions issued'],
        ]);
        handleQuestion(t);
      }
    }, 380);
  }, [currentPanel, detectIntent, handleReport, handleCommand, handleOfflineSim, handleQuestion, handlePanelModify, clearOffline, addActionLog, openOnboarding]);

  // ─── Effects ──────────────────────────────────────────────────────────────────
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

  const value = {
    messages, setMessages,
    input, setInput,
    thinking, setThinking,
    currentPanel, setCurrentPanel,
    cfrPending, setCfrPending,
    cfrPin, setCfrPin,
    cfrError, setCfrError,
    threadRef, inputRef,
    liveDataProvider,
    liveIds,
    submit,
    dark,
    addActionLog,
    addSpatialWidget,
  };

  return (
    <KairosContext.Provider value={value}>
      {children}
    </KairosContext.Provider>
  );
}

export function useKairos() {
  return React.useContext(KairosContext);
}
