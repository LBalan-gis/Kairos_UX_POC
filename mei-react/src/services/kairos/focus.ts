import type { FocusResponse } from '../../types/kairos';

export const FOCUS_RESPONSES: Record<string, FocusResponse> = {
  film_tension: {
    text: 'Root cause isolated: film tension FT-1101 drifted from 42N to 34N at 08:14. The PLC auto-reduced BM-1101 to 218 bpm in response — this is the origin node for the entire cascade.',
    chartKey: 'tension',
    actions: [{ label: '→ Trace signal', cmd: 'trace prediction' }, { label: '→ Simulate correction', cmd: 'simulate correction' }],
  },
  hidden_loss: {
    text: 'Hidden micro-stop loss exposed: 23 minutes of sub-2-min stops on CT-1101 that never triggered a formal downtime event. This is the OEE gap that standard reports miss entirely.',
    actions: [{ label: '→ Root cause', cmd: 'root cause' }, { label: '→ Impact on output', cmd: 'show planned vs actual' }],
  },
  sim_corrected: {
    text: 'Correction simulation: adjusting film tension to 42N restores BM-1101 to 240 bpm in ~12 minutes. Projected OEE recovery to 92.1% — within 0.3pp of golden batch. Output gap closes by shift end.',
    metrics: [
      { label: 'Recovery time', value: '12 min', severity: 'ok' },
      { label: 'OEE projected', value: '92.1%', sub: 'vs 78.4% now', severity: 'ok' },
      { label: 'Output recovery', value: '+1,840', sub: 'units', severity: 'ok' },
      { label: 'Confidence', value: '97%', bar: true, severity: 'ok' },
    ],
    actions: [{ label: '→ OTIF impact', cmd: 'otif delivery risk friday' }, { label: '→ Generate deviation', cmd: 'generate incident report' }],
  },
  impact_yield: {
    text: 'Downstream impact mapped: MES has flagged the serialization queue at 340 unverified units. QA sign-off is blocked until BM-1101 is corrected and the queue reconciled. SAP batch close at 14:30 is at risk.',
    actions: [{ label: '→ Serialization queue', cmd: 'serialization queue' }, { label: '→ OTIF risk', cmd: 'otif delivery risk friday' }],
  },
  batch_golden: {
    text: 'Golden batch PH-2025-088 ran at 92.4% OEE — 240 bpm, zero micro-stops, 4,800 units Shift B. The 14pp gap to current batch is entirely explained by the film tension fault. Process conditions were identical.',
    chartKey: 'golden',
    actions: [{ label: '→ Root cause', cmd: 'root cause' }],
  },
  reject_count: {
    text: 'Vision system VI-1101 reject rate is 4.2% — 2.8× above the 1.5% limit. All rejections trace to incomplete blister forming caused by the film tension fault. 77 units quarantined since 08:14.',
    chartKey: 'reject',
    actions: [{ label: '→ Root cause', cmd: 'root cause' }, { label: '→ Generate deviation', cmd: 'generate incident report' }],
  },
};

export function resolveFocusId(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('focus ')) return lower.replace('focus ', '').trim();
  if (lower.includes('root cause') || lower.includes('isolate')) return 'film_tension';
  if (lower.includes('correction') || lower.includes('corrected') || lower.includes('simulate')) return 'sim_corrected';
  if (lower.includes('affected') || lower.includes('systems')) return 'impact_yield';
  if (lower.includes('golden')) return 'batch_golden';
  if (lower.includes('deviation') || lower.includes('explain') || lower.includes('reject')) return 'reject_count';
  if (lower.includes('drift path') || lower.includes('film') || lower.includes('tension')) return 'film_tension';
  return 'hidden_loss';
}
