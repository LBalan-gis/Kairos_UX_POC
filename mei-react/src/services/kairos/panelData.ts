export type OtifPanelRow = {
  label: string;
  value: string;
};

export type TracePanelRow = {
  tag: string;
  icon: string;
  col: string;
  main: string;
  sub: string;
};

export function getOtifPanelRows(): OtifPanelRow[] {
  return [
    { label: 'DELIVERY TARGET', value: 'Friday 17:00 · SKU 41829' },
    { label: 'OUTPUT DEFICIT', value: '1,840 units · +2.3/min' },
    { label: 'ERP SYSTEM', value: 'SAP S/4HANA · Batch close 14:30' },
    { label: 'RECOVERY PATH', value: 'BM-1101 correction → 94% OTIF restore' },
  ];
}

export function getTracePanelRows(polled: number, colors: {
  row0: string;
  row1: string;
  row2: string;
  row3: string;
}): TracePanelRow[] {
  return [
    {
      tag: 'PREDICTION',
      icon: '⬡',
      col: colors.row0,
      main: 'Shift B will miss target by 2,200 units',
      sub: 'causal weight: 0.97 · engine: physics-ML hybrid',
    },
    {
      tag: 'ROOT CAUSE',
      icon: '↑',
      col: colors.row1,
      main: 'Film tension drift · BM-1101 · FT-1101',
      sub: 'sensor reads 34.0 N vs 42.0 N setpoint — Δ −8.0 N',
    },
    {
      tag: 'HARDWARE',
      icon: '↑',
      col: colors.row2,
      main: 'FT-1101 · Modbus TCP · 10.0.0.12:502',
      sub: `register 40001 · last polled ${polled}ms ago · 20Hz`,
    },
    {
      tag: 'ATTESTATION',
      icon: '✓',
      col: colors.row3,
      main: 'Prediction anchored to verified physical node',
      sub: 'KairOS cannot reference sensors absent from the Unified Namespace',
    },
  ];
}
