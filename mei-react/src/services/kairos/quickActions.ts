export type KairosQuickAction = {
  label: string;
  cmd: string;
  icon: string;
};

export const KAIROS_QUICK_ACTIONS: readonly KairosQuickAction[] = [
  { label: 'OEE by batch', cmd: 'show me oee by batch', icon: '⬡' },
  { label: 'OTIF risk', cmd: 'otif delivery risk friday', icon: '⚠' },
  { label: 'Film tension drift', cmd: 'film tension drift', icon: '↗' },
  { label: 'Planned vs actual', cmd: 'show me planned vs actual', icon: '▦' },
  { label: 'Machine health', cmd: 'show machine health panel bm-1101', icon: '◎' },
  { label: 'Shift handover', cmd: 'generate shift report', icon: '⇄' },
  { label: 'Incident report', cmd: 'generate incident report', icon: '⊟' },
  { label: 'Restore all', cmd: 'restore all machines', icon: '↺' },
] as const;
