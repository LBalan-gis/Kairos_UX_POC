import type { ZoneId } from '../../types/domain';

export const ZONE_COLOR: Record<ZoneId, string> = {
  A: '#9CA3AF',
  B: '#EF4444',
  C: '#F59E0B',
  D: '#6366F1',
  E: '#BE185D',
  F: '#0D9488',
};

export const ZONE_COLOR_DARK: Record<ZoneId, string> = {
  A: '#6B7280',
  B: '#F87171',
  C: '#FCD34D',
  D: '#A78BFA',
  E: '#F9A8D4',
  F: '#2DD4BF',
};

export const LEGEND_ITEMS = [
  { type: 'line', color: '#EF4444', label: 'Critical path' },
  { type: 'line', color: '#F59E0B', label: 'High impact' },
  { type: 'line', color: '#6366F1', label: 'Impact' },
  { type: 'line', color: '#0D9488', label: 'System' },
  { type: 'dashed', color: '#9CA3AF', label: 'Context' },
  { type: 'dashed', color: '#EF4444', label: 'Unchanged' },
  { type: 'dashed', color: '#16A34A', label: 'Corrected' },
  { type: 'circle', color: '#6B7280', label: 'Data source' },
  { type: 'ring', color: '#6B7280', label: 'Derived insight' },
] as const;

export function getZoneColor(zone: ZoneId | undefined, dark: boolean) {
  if (!zone) return '#64748B';
  return dark ? ZONE_COLOR_DARK[zone] : ZONE_COLOR[zone];
}

export function getGraphSurfaceTheme(dark: boolean) {
  return {
    textPrimary: dark ? '#F1F5F9' : '#0F172A',
    textSecondary: '#64748B',
    border: dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
    badgeBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
    showAllBg: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
    focusTrackOff: dark ? '#334155' : '#CBD5E1',
    legendDim: dark ? 'rgba(255,255,255,0.35)' : 'rgba(10,14,26,0.40)',
    legendBg: dark ? 'rgba(12,18,32,0.92)' : 'rgba(255,255,255,0.92)',
    legendBorder: dark ? 'rgba(255,255,255,0.07)' : 'rgba(10,14,26,0.07)',
  };
}

export function getStateBadgeTone(state: string | undefined) {
  if (state === 'critical') {
    return {
      background: '#FEF2F2',
      text: '#DC2626',
      border: 'rgba(220,38,38,0.20)',
    };
  }

  if (state === 'warning') {
    return {
      background: '#FFFBEB',
      text: '#D97706',
      border: 'rgba(217,119,6,0.20)',
    };
  }

  return null;
}

export function getSeverityTone(severity: 'High' | 'Medium' | 'Normal') {
  if (severity === 'High') return '#EF4444';
  if (severity === 'Medium') return '#F59E0B';
  return '#16A34A';
}
