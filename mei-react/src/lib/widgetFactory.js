// ─── Widget payload factory ───────────────────────────────────────────────────
// Pure function — no React, no store access.
// Returns the widget object (with optional spatialBinding) matching the same
// if/else logic that was previously inline inside the submit callback.

export function buildWidgetPayload(text) {
  const tl = text.toLowerCase();

  if (tl.includes('machine health') || tl.includes('health panel')) {
    return {
      type: 'gauge', confidence: 0.94,
      props: { value: 78.4, max: 100, variant: 'radial', label: 'OEE · BM-1101', unit: '%', tag: 'KPI-OEE-L1', live: true, warnAt: 85, critAt: 70 },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
      children: [
        {
          type: 'chart', confidence: 0.91,
          props: { chartType: 'area', label: 'Film Tension · FT-1101', unit: 'N', height: 100,
            datasets: [{ label: 'FT-1101', data: [42,41.8,41.2,40.5,39.8,38.4,37.1,36.0,35.2,34.8,34.4,34.0], color: '#F59E0B', fill: true }],
            labels: ['08:10','08:14','08:18','08:22','08:26','08:30','08:34','08:38','08:42','08:46','08:50','08:54'] },
        },
        {
          type: 'action', confidence: 0.97,
          props: { label: 'Adjust FT-1101 Tension Roller → 42 N', action: 'adjust_tension_ft1101', machineId: 'bf_1101', risk: 'medium' },
        },
      ],
    };
  } else if (tl.includes('gauge') || tl.includes('oee gauge')) {
    return {
      type: 'gauge', confidence: 0.93,
      props: { value: 78.4, max: 100, variant: 'radial', label: 'OEE · Line 1', unit: '%', tag: 'KPI-OEE-L1', live: true, warnAt: 85, critAt: 70 },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('sparkline') || tl.includes('trend') || tl.includes('tension')) {
    return {
      type: 'chart', confidence: 0.91,
      props: { chartType: 'area', label: 'Film Tension · FT-1101', unit: 'N', height: 140,
        datasets: [{ label: 'FT-1101', data: [42,41.8,41.2,40.5,39.8,38.4,37.1,36.0,35.2,34.8,34.4,34.0], color: '#F59E0B', fill: true }],
        labels: ['08:10','08:14','08:18','08:22','08:26','08:30','08:34','08:38','08:42','08:46','08:50','08:54'] },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('line status') || tl.includes('table')) {
    return {
      type: 'table', confidence: 0.89,
      props: {
        title: 'Line Status',
        columns: ['Line', 'OEE', 'Speed', 'Status'],
        statusCol: 'Status',
        rows: [
          { Line: 'L1 · BM-1101', OEE: '78.4%', Speed: '218 bpm', Status: 'warning' },
          { Line: 'L2 · BM-1201', OEE: '93.4%', Speed: '224 bpm', Status: 'ok' },
        ],
      },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('adjust tension') || tl.includes('throttle') || tl.includes('execute action')) {
    return {
      type: 'action', confidence: 0.97,
      props: { label: 'Adjust FT-1101 Tension Roller → 42 N', action: 'adjust_tension_ft1101', machineId: 'bf_1101', risk: 'medium' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };

  // ── Control widget demos ────────────────────────────────────────────
  } else if (tl.includes('switch') || tl.includes('toggle')) {
    return {
      type: 'control', confidence: 0.90,
      props: { controlType: 'switch', label: 'Auto-Speed Correction · BM-1101', value: false, action: 'toggle_auto_correct', machineId: 'bf_1101' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('slider') || tl.includes('set speed') || tl.includes('setpoint')) {
    return {
      type: 'control', confidence: 0.88,
      props: { controlType: 'slider', label: 'Speed Setpoint · BM-1101', value: 218, min: 160, max: 260, step: 1, unit: 'bpm', action: 'set_speed_bm1101', machineId: 'bf_1101' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('radio') || tl.includes('mode') || tl.includes('speed mode')) {
    return {
      type: 'control', confidence: 0.87,
      props: { controlType: 'radio', label: 'Speed Mode · BM-1101', value: 'Normal', options: ['Slow (180 bpm)', 'Normal (240 bpm)', 'High (260 bpm)'], action: 'set_speed_mode', machineId: 'bf_1101' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('checkbox') || tl.includes('check')) {
    return {
      type: 'control', confidence: 0.85,
      props: { controlType: 'checkbox', label: 'Alerts · Line 1', value: ['OEE drop', 'Tension drift'], options: ['OEE drop', 'Tension drift', 'Speed deviation', 'Reject rate spike', 'Serialization queue'], action: 'set_alert_prefs' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('calendar') || tl.includes('date') || tl.includes('schedule')) {
    return {
      type: 'control', confidence: 0.84,
      props: { controlType: 'calendar', label: 'Target Batch Close Date', value: new Date().toISOString().slice(0, 10), action: 'set_batch_close_date' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('clock') || tl.includes('time') || tl.includes('shift start')) {
    return {
      type: 'control', confidence: 0.84,
      props: { controlType: 'clock', label: 'Shift Handover Time', value: '14:30', action: 'set_handover_time' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  } else if (tl.includes('form') || tl.includes('input') || tl.includes('control')) {
    return {
      type: 'control', confidence: 0.86,
      props: { controlType: 'slider', label: 'Tension Setpoint · FT-1101', value: 42, min: 20, max: 60, step: 0.5, unit: 'N', action: 'set_tension_ft1101', machineId: 'bf_1101' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
      children: [
        { type: 'control', confidence: 0.86, props: { controlType: 'switch', label: 'Lock setpoint after correction', value: false, action: 'lock_setpoint', machineId: 'bf_1101' } },
        { type: 'control', confidence: 0.83, props: { controlType: 'calendar', label: 'Schedule correction date', action: 'schedule_correction' } },
      ],
    };

  } else if (tl.includes('composable') || tl.includes('monitor panel') || tl.includes('layout')) {
    return {
      type: 'layout', confidence: 0.93,
      props: { title: 'BM-1101 Monitor', direction: 'column' },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
      children: [
        {
          type: 'layout', confidence: 0.93,
          props: { direction: 'row' },
          children: [
            { type: 'gauge', confidence: 0.94, props: { value: 78.4, max: 100, label: 'OEE', unit: '%', warnAt: 85, critAt: 70 } },
            { type: 'stat',  confidence: 0.91, props: { label: 'Speed', value: '218', unit: 'bpm', delta: -6, deltaLabel: 'vs target' } },
            { type: 'stat',  confidence: 0.91, props: { label: 'Rejects', value: '14', unit: '/hr', delta: 8, deltaLabel: 'vs 1h ago' } },
          ],
        },
        {
          type: 'chart', confidence: 0.91,
          props: { chartType: 'line', label: 'Film Tension · FT-1101', unit: 'N', height: 90,
            datasets: [{ label: 'FT-1101', data: [42,41.8,41.2,40.5,39.8,38.4,37.1,36.0,35.2,34.8], color: '#F59E0B', fill: false }],
            labels: ['08:10','08:18','08:26','08:34','08:42','08:46','08:50','08:52','08:54','08:56'] },
        },
        { type: 'control', confidence: 0.88, props: { controlType: 'slider', label: 'Tension Setpoint · FT-1101', value: 42, min: 20, max: 60, step: 0.5, unit: 'N', action: 'set_tension_ft1101', machineId: 'bf_1101' } },
        { type: 'action', confidence: 0.97, props: { label: 'Apply Tension Correction → 42 N', action: 'adjust_tension_ft1101', machineId: 'bf_1101', risk: 'medium' } },
      ],
    };

  } else {
    // Default: radial OEE gauge
    return {
      type: 'gauge', confidence: 0.88,
      props: { value: 78.4, max: 100, variant: 'radial', label: 'OEE · Line 1', unit: '%', tag: 'KPI-OEE-L1', live: true },
      spatialBinding: { entityId: 'vis_1101', anchor: 'top' },
    };
  }
}
