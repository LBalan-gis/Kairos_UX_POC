import type { WidgetPresetMap } from '../../types/kairos';

export const WIDGET_PRESETS: WidgetPresetMap = {
  gauge: { type: 'gauge', confidence: 0.94, props: { value: 78.4, max: 100, label: 'OEE · BM-1101', unit: '%', warnAt: 85, critAt: 70 } },
  oee: { type: 'gauge', confidence: 0.94, props: { value: 78.4, max: 100, label: 'OEE · BM-1101', unit: '%', warnAt: 85, critAt: 70 } },
  stat: { type: 'stat', confidence: 0.91, props: { label: 'Throughput', value: '312', unit: 'u/min' } },
  speed: { type: 'stat', confidence: 0.91, props: { label: 'Speed', value: '218', unit: 'bpm', delta: -6, deltaLabel: 'vs target' } },
  rejects: { type: 'stat', confidence: 0.91, props: { label: 'Rejects', value: '14', unit: '/hr', delta: 8, deltaLabel: 'vs 1h ago' } },
  chart: { type: 'chart', confidence: 0.91, props: { chartType: 'line', label: 'Film Tension · FT-1101', unit: 'N', height: 90, datasets: [{ label: 'FT-1101', data: [42, 41.8, 41.2, 40.5, 39.8, 38.4, 37.1, 36.0, 35.2, 34.8], color: '#F59E0B', fill: false }], labels: ['08:10', '08:18', '08:26', '08:34', '08:42', '08:46', '08:50', '08:52', '08:54', '08:56'] } },
  trend: { type: 'chart', confidence: 0.91, props: { chartType: 'line', label: 'Film Tension · FT-1101', unit: 'N', height: 90, datasets: [{ label: 'FT-1101', data: [42, 41.8, 41.2, 40.5, 39.8, 38.4, 37.1, 36.0, 35.2, 34.8], color: '#F59E0B', fill: false }], labels: ['08:10', '08:18', '08:26', '08:34', '08:42', '08:46', '08:50', '08:52', '08:54', '08:56'] } },
  table: { type: 'table', confidence: 0.89, props: { title: 'Line Status', columns: ['Line', 'OEE', 'Speed', 'Status'], statusCol: 'Status', rows: [{ Line: 'L1 · BM-1101', OEE: '78.4%', Speed: '218 bpm', Status: 'warning' }, { Line: 'L2 · BM-1201', OEE: '93.4%', Speed: '224 bpm', Status: 'ok' }] } },
  action: { type: 'action', confidence: 0.97, props: { label: 'Apply Tension Correction → 42 N', action: 'adjust_tension_ft1101', machineId: 'bf_1101', risk: 'medium' } },
  slider: { type: 'control', confidence: 0.88, props: { controlType: 'slider', label: 'Tension Setpoint · FT-1101', value: 42, min: 20, max: 60, step: 0.5, unit: 'N', action: 'set_tension_ft1101', machineId: 'bf_1101' } },
  switch: { type: 'control', confidence: 0.9, props: { controlType: 'switch', label: 'Auto-Speed Correction · BM-1101', value: false, action: 'toggle_auto_correct', machineId: 'bf_1101' } },
};

export function applyPanelModification(currentPanel: any, text: string) {
  const lower = text.toLowerCase();
  const isRemove = ['remove', 'delete', 'drop', 'take out', 'exclude'].some((keyword) => lower.includes(keyword));
  const typeMap = { graph: 'chart', trend: 'chart', tension: 'chart', speed: 'stat', rejects: 'stat', oee: 'gauge', control: 'control' };
  const matchedKey = Object.keys(WIDGET_PRESETS).find((key) => lower.includes(key));
  const resolvedKey = matchedKey || Object.entries(typeMap).find(([keyword]) => lower.includes(keyword))?.[1];

  if (!resolvedKey) {
    return {
      ok: false,
      text: 'I couldn\'t identify which widget to modify. Try: "add gauge", "remove chart", "add action button".',
    };
  }

  const nextPanel = JSON.parse(JSON.stringify(currentPanel));
  if (!Array.isArray(nextPanel.children)) nextPanel.children = [];

  if (isRemove) {
    const preset = WIDGET_PRESETS[resolvedKey];
    const typeToRemove = preset?.type || resolvedKey;
    const idx = nextPanel.children.findIndex((child: any) => child.type === typeToRemove);
    if (idx === -1) {
      return { ok: false, text: `No ${typeToRemove} widget found in the panel to remove.` };
    }
    nextPanel.children.splice(idx, 1);
  } else {
    const preset = WIDGET_PRESETS[resolvedKey] || WIDGET_PRESETS.gauge;
    nextPanel.children.push({ type: preset.type, confidence: preset.confidence, props: { ...preset.props } });
  }

  return {
    ok: true,
    panel: nextPanel,
    resolvedKey,
    verb: isRemove ? 'removed' : 'added',
  };
}
