import type { KairosReport } from '../../types/kairos';
import type { PlantReportMetrics } from '../../domain/plant/model';

export function buildKairosReport(metrics: PlantReportMetrics, text: string): KairosReport {
  const lower = text.toLowerCase();
  let type = 'incident';
  if (lower.includes('batch') || lower.includes('bpr') || lower.includes('record')) type = 'batch';
  else if (lower.includes('shift') || lower.includes('handover')) type = 'shift';

  const ts = new Date().toLocaleString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { oee, speed, tension } = metrics;

  if (type === 'batch') {
    return {
      type: 'BATCH',
      pill: 'batch',
      title: 'Batch Record — PH-2026-018',
      chartKey: 'golden',
      meta: ['SKU 41829', 'Lisinopril 10mg', 'Operator: K. Mueller', ts],
      sections: [
        { label: 'Batch Status', text: `Batch PH-2026-018 active on Line 1, Shift B. 1,840 units behind plan. OEE ${oee}% — globally compromised.` },
        { label: 'Quality', text: '77 units rejected (4.2% vs 1.5% limit). Serial queue at 340 unverified units.' },
        { label: 'Open Deviation', text: 'OEE-2026-031 — 23 min hidden micro-stop loss. QA acknowledgement pending.' },
      ],
      table: [
        { tag: 'OEE', name: 'Efficiency', current: `${oee}%`, target: '92.4%', status: oee < 85 ? 'warning' : 'ok' },
        { tag: 'Speed', name: 'Blister Speed', current: `${speed} bpm`, target: '240 bpm', status: speed < 230 ? 'warning' : 'ok' },
        { tag: 'Output', name: 'Units Packed', current: '1,120', target: '2,960 plan', status: 'critical' },
        { tag: 'Reject', name: 'Reject Rate', current: '4.2%', target: '1.5% limit', status: 'critical' },
      ],
    };
  }

  if (type === 'shift') {
    return {
      type: 'SHIFT',
      pill: 'shift',
      title: 'Shift Handover — Shift B → C',
      chartKey: 'oee',
      meta: ['Line 1', 'Operator: K. Mueller', 'Handover to Shift C', ts],
      sections: [
        { label: 'Open Incidents', text: 'OEE-2026-031 open — film tension drift BM-1101. Tension roller adjustment required.' },
        { label: 'Line Status', text: `Line 2 normal — BM-1201 at 240 bpm, OEE 91.8%. Line 1 at risk (OEE ${oee}%).` },
        { label: 'Handover Notes', text: 'Tension roller requires inspection. Serialization queue must be reconciled.' },
      ],
      table: [
        { tag: 'L1 OEE', name: 'Line 1', current: `${oee}%`, target: '92.4%', status: oee < 85 ? 'warning' : 'ok' },
        { tag: 'L2 OEE', name: 'Line 2', current: '91.8%', target: '92.4%', status: 'ok' },
        { tag: 'Dev', name: 'Open', current: '1', target: '0', status: 'critical' },
        { tag: 'Serial', name: 'Queue', current: '340', target: '<200', status: 'warning' },
      ],
    };
  }

  return {
    type: 'DEVIATION',
    pill: 'deviation',
    title: 'Deviation Report — OEE-2026-031',
    chartKey: 'tension',
    meta: ['Batch PH-2026-018', 'Line 1', 'Shift B', ts],
    sections: [
      { label: 'Incident Summary', text: `Film tension drifted from 42N to ${tension}N. BM-1101 auto-reduced to ${speed} bpm. CT-1101 logged 11 micro-jams.` },
      { label: 'Root Cause', text: 'Film tension drift at FT-1101, 96% confidence.' },
      { label: 'Recommended Action', text: 'Adjust tension roller to 42N. Recovery: 12 min, 97% confidence. QA sign-off required.' },
    ],
    table: [
      { tag: 'FT-1101', name: 'Film Tension', current: `${tension}N`, target: '42N', status: tension < 40 ? 'warning' : 'ok' },
      { tag: 'BM-1101', name: 'Blister Speed', current: `${speed} bpm`, target: '240 bpm', status: speed < 230 ? 'warning' : 'ok' },
      { tag: 'VI-1101', name: 'Reject Rate', current: '4.2%', target: '1.5% limit', status: 'critical' },
      { tag: 'SZ-1101', name: 'Serial Queue', current: '340 units', target: '<200', status: 'warning' },
    ],
  };
}
