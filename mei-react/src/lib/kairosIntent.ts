// ─── Knowledge ────────────────────────────────────────────────────────────────
export interface KnowledgeAction {
  label: string;
  cmd: string;
}

export interface KnowledgeEntry {
  match: string[];
  response: string;
  focusIds: string[];
  chartKey?: string;
  otifAlert?: boolean;
  actions: KnowledgeAction[];
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  { match:['oee','overall equipment','oee by batch','batch oee','78','performance'],
    response:'OEE on Batch PH-2026-018 is running at 78.4% — down from the 92.4% golden batch baseline. The primary driver is 23 minutes of hidden micro-stop loss on CT-1101 sitting below the 2-minute OEE logging threshold, so it never shows up in standard downtime reports.',
    focusIds:['batch_current','planned_vs_actual','hidden_loss'], chartKey:'oee',
    actions:[{ label:'→ Show hidden loss', cmd:'show drift path' },{ label:'→ Root cause', cmd:'isolate root cause' }] },
  { match:['blister','bm-1101','bm1101','blister machine','speed','218','240','bpm'],
    response:'BM-1101 blister machine is running at 218 bpm — 9.2% below the 240 bpm setpoint. The PLC auto-reduced speed at 08:14 in response to film tension dropping to 34N. Root cause of OEE loss at 97% confidence.',
    focusIds:['blister_machine','film_tension','blister_speed'], chartKey:'speed',
    actions:[{ label:'→ Show drift path', cmd:'show drift path' }] },
  { match:['planned','actual','output','target','shift target','miss','behind','gap','1840','2200','units'],
    response:'Current output gap is 1,840 units behind plan as of 09:02, widening at 2.3 units per minute. Shift B will miss its target by approximately 2,200 units — a £34,000 shift value impact.',
    focusIds:['planned_vs_actual','impact_yield'], chartKey:'planned',
    actions:[{ label:'→ Simulate correction', cmd:'simulate correction' },{ label:'→ Show value at risk', cmd:'compare to golden batch' }] },
  { match:['film tension','tension','roller','42n','34n','forming','tension drift'],
    response:'Root cause confirmed at 96% confidence: film tension on BM-1101 has drifted from 42N to 34N since 08:14. A 4-minute tension roller adjustment will restore BM-1101 to 240 bpm and stop the output gap widening.',
    focusIds:['film_tension','blister_machine','blister_speed'], chartKey:'tension',
    actions:[{ label:'→ Trace signal', cmd:'trace prediction' },{ label:'→ Simulate correction', cmd:'simulate correction' }] },
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
  { match:['offline','turned off','powered down','removed','down','cw-1201','cw1201','checkweigher'],
    response:'CW-1201 Checkweigher on Line 2 is offline — packs cannot be weighed or released downstream. Line 2 throughput is blocked at that station. OEE impact is immediate. Options: restore the unit, raise a bypass deviation for manual weigh check, or reroute to Line 1 if capacity allows.',
    focusIds:['serialization_queue'],
    actions:[{ label:'→ Line 2 status', cmd:'show affected systems' }, { label:'→ Generate deviation', cmd:'generate incident report' }]
  },
  { match:['batch status','batch summary','ph-2026','lisinopril','sku'],
    response:'Batch PH-2026-018 · SKU 41829 (Lisinopril 10mg 28-pack) · Shift B · Operator: K. Mueller. 1,840 units behind plan with OEE at 78.4%. Can recover with film tension correction in the next 15 min.',
    focusIds:['batch_current','planned_vs_actual'],
    actions:[{ label:'→ Simulate correction', cmd:'simulate correction' }] },
  { match:['otif','on-time in-full','on time','friday','delivery','dispatch','sap schedule','erp schedule','ship','batch completion','miss target'],
    response:'Physics engine predicts Line 1 will miss the Friday 17:00 SAP delivery target. The current output deficit of 1,840 units is widening at 2.3 units/min — the batch will not close by the 14:30 handover window without intervention. Correcting BM-1101 now restores OTIF at 94% confidence. Line 2 is tracking on time.',
    focusIds:['planned_vs_actual','impact_yield','sim_corrected'], chartKey:'planned', otifAlert: true,
    actions:[{ label:'→ Simulate correction', cmd:'simulate correction' },{ label:'→ Impact on ERP', cmd:'show affected systems' }] },
];

export const FALLBACK: { response: string; focusIds: string[]; actions: KnowledgeAction[] } = {
  response:'I can help you investigate this incident. Ask about film tension drift, blister speed, hidden OEE loss, shift target gap, or serialization queue.',
  focusIds:['hidden_loss'], actions:[{ label:'→ Explain deviation', cmd:'explain deviation' }],
};

export const GRAPH_CMDS: string[] = ['drift path','root cause','simulate correction','explain deviation','show affected systems','cross line','golden batch','tension impact','hidden loss','micro-stop'];

// ─── Machine label → equipment id map ────────────────────────────────────────
export const MACHINE_ID_MAP: Record<string, string> = {
  'cw-1101':'cw_1101','cw1101':'cw_1101','cw 1101':'cw_1101',
  'cw-1201':'cw_1201','cw1201':'cw_1201','cw 1201':'cw_1201','checkweigher':'cw_1201',
  'bf-1101':'bf_1101','bf1101':'bf_1101','bm-1101':'bf_1101','blister former':'bf_1101','blister machine':'bf_1101',
  'bf-1201':'bf_1201','bf1201':'bf_1201','bm-1201':'bf_1201',
  'ctn-1101':'ctn_1101','ctn1101':'ctn_1101','cartoner l1':'ctn_1101',
  'ctn-1201':'ctn_1201','ctn1201':'ctn_1201','cartoner l2':'ctn_1201',
  'agg-1101':'agg_1101','agg1101':'agg_1101','serialization l1':'agg_1101',
  'agg-1201':'agg_1201','agg1201':'agg_1201','serialization l2':'agg_1201',
  'vis-1101':'vis_1101','vis1101':'vis_1101','vision l1':'vis_1101',
  'vis-1201':'vis_1201','vis1201':'vis_1201','vision l2':'vis_1201',
  'lab-1101':'lab_1101','lab1101':'lab_1101','labeler l1':'lab_1101',
  'lab-1201':'lab_1201','lab1201':'lab_1201','labeler l2':'lab_1201',
};

export function resolveMachineId(text: string): string | null {
  const t = text.toLowerCase();
  for (const [key, id] of Object.entries(MACHINE_ID_MAP)) {
    if (t.includes(key)) return id;
  }
  return null;
}

export const MACHINE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(MACHINE_ID_MAP).map(([, id]) => [id, id.replace('_','-').toUpperCase()])
);

// ─── Intent detection ─────────────────────────────────────────────────────────
export function detectIntent(text: string, currentPanel: unknown): string {
  const t = text.toLowerCase().trim();
  if (currentPanel) {
    const modKw = ['add','remove','delete','replace','drop','put','insert','take out','include','exclude'];
    const widgetKw = ['gauge','chart','trend','stat','action','slider','switch','table','oee','speed','tension','rejects','control','graph'];
    if (modKw.some(k => t.includes(k)) && widgetKw.some(k => t.includes(k))) return 'panel_modify';
  }
  const hasTemp = t.includes('temperature') || t.includes('temp spike') || t.includes('temp deviation') || t.includes('thermal');
  const hasCartoner = t.includes('cartoner') || t.includes('ct-1101') || t.includes('ct1101');
  const hasFabricate = t.includes('fabricate') || t.includes('make up') || t.includes('invent a') || t.includes('fake') || t.includes('create a deviation') || t.includes('log a');
  if ((hasTemp && hasCartoner) || (hasFabricate && (hasCartoner || t.includes('nonexistent')))) return 'aegis';
  const hasOverride = t.includes('execute override') || t.includes('force offline') || t.includes('force bm') || t.includes('override') || (t.includes('take') && t.includes('offline') && resolveMachineId(t));
  if (hasOverride) return 'cfr_block';
  if (t.includes('trace') || t.includes('anchor') || t.includes('show your work') || t.includes('verify prediction') || t.includes('prove')) return 'trace';
  if (t.includes('widget') || t.includes('gauge') || t.includes('sparkline') || t.includes('trend') || t.includes('show me a') || t.includes('machine health') || t.includes('health panel') || t.includes('execute action') || t.includes('adjust tension') || t.includes('throttle') || t.includes('control') || t.includes('switch') || t.includes('checkbox') || t.includes('radio') || t.includes('slider') || t.includes('calendar') || t.includes('clock') || t.includes('form') || t.includes('input') || t.includes('composable') || t.includes('monitor panel') || t.includes('layout')) return 'widget';
  if (t.includes('generate') || t.includes('report') || t.includes('gen ')) return 'report';
  if (GRAPH_CMDS.some(c => t.includes(c))) return 'command';
  if (t.includes('onboard') || t.includes('add machine') || t.includes('new machine') || t.includes('plug in') || t.includes('install machine')) return 'onboard';
  if (t.includes('restore all') || t.includes('bring all') || t.includes('clear offline')) return 'offline_clear';
  const offlineKw = t.includes('offline') || t.includes('turn off') || t.includes('shut down') || t.includes('restore') || t.includes('bring back') || t.includes('online') || (t.includes('simulate') && (t.includes('off') || t.includes('down') || t.includes('fail')));
  if (offlineKw && resolveMachineId(t)) return 'offline_sim';
  return 'question';
}
