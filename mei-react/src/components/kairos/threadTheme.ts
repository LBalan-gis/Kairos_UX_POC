export type MessageSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY';

export type AccentTone = {
  text: string;
  bg: string;
  border: string;
  accent: string;
};

export type ReportCardTheme = {
  cardBg: string;
  cardBorder: string;
  headBorder: string;
  titleColor: string;
  metaColor: string;
  labelColor: string;
  bodyColor: string;
  printBg: string;
  printBorder: string;
  printColor: string;
  chartBg: string;
  chartBorder: string;
  thColor: string;
  tbBorder: string;
  tagColor: string;
  nameColor: string;
  targetColor: string;
};

export function getStatusColors(dark: boolean) {
  return {
    critical: dark ? '#F87171' : '#b91c1c',
    warning: dark ? '#FBBF24' : '#b45309',
    ok: dark ? '#4ADE80' : '#166534',
  };
}

export function getPillStyles(dark: boolean) {
  return {
    deviation: dark ? { bg: 'rgba(239,68,68,0.15)', color: '#F87171', border: 'rgba(239,68,68,0.35)' } : { bg: '#fef2f2', color: '#b91c1c', border: 'rgba(239,68,68,0.3)' },
    batch: dark ? { bg: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: 'rgba(34,197,94,0.30)' } : { bg: '#f0fdf4', color: '#166534', border: 'rgba(34,197,94,0.3)' },
    shift: dark ? { bg: 'rgba(139,92,246,0.12)', color: '#C084FC', border: 'rgba(139,92,246,0.30)' } : { bg: '#f5f3ff', color: '#5b21b6', border: 'rgba(139,92,246,0.3)' },
  };
}

const SEV: Record<MessageSeverity, AccentTone> = {
  CRITICAL: { text: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', accent: '#EF4444' },
  WARNING: { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', accent: '#F59E0B' },
  ADVISORY: { text: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.20)', accent: '#3B82F6' },
};

const SEV_LIGHT: Record<MessageSeverity, AccentTone> = {
  CRITICAL: { text: '#C62828', bg: 'rgba(198,40,40,0.09)', border: 'rgba(198,40,40,0.22)', accent: '#C62828' },
  WARNING: { text: '#B65A00', bg: 'rgba(182,90,0,0.09)', border: 'rgba(182,90,0,0.22)', accent: '#B65A00' },
  ADVISORY: { text: '#0F766E', bg: 'rgba(15,118,110,0.08)', border: 'rgba(15,118,110,0.19)', accent: '#0F766E' },
};

export function getSeverityTone(dark: boolean, severity: MessageSeverity): AccentTone {
  return dark ? SEV[severity] : SEV_LIGHT[severity];
}

export function getReportCardTheme(dark: boolean): ReportCardTheme {
  return {
    cardBg: dark ? 'rgba(255,255,255,0.04)' : 'rgba(247,248,246,0.90)',
    cardBorder: dark ? 'rgba(255,255,255,0.10)' : 'rgba(72,74,78,0.10)',
    headBorder: dark ? 'rgba(255,255,255,0.07)' : 'rgba(72,74,78,0.08)',
    titleColor: dark ? '#E5E7EB' : '#0F172A',
    metaColor: dark ? 'rgba(255,255,255,0.40)' : '#5C6668',
    labelColor: dark ? 'rgba(255,255,255,0.35)' : '#5C6668',
    bodyColor: dark ? 'rgba(255,255,255,0.75)' : '#15202F',
    printBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(72,74,78,0.035)',
    printBorder: dark ? 'rgba(255,255,255,0.12)' : 'rgba(72,74,78,0.10)',
    printColor: dark ? 'rgba(255,255,255,0.70)' : '#2D3A4A',
    chartBg: dark ? 'rgba(255,255,255,0.03)' : 'rgba(240,242,239,0.92)',
    chartBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(72,74,78,0.08)',
    thColor: dark ? 'rgba(255,255,255,0.35)' : '#5B6668',
    tbBorder: dark ? 'rgba(255,255,255,0.07)' : 'rgba(72,74,78,0.08)',
    tagColor: dark ? '#93C5FD' : '#0F766E',
    nameColor: dark ? 'rgba(255,255,255,0.70)' : '#1F2C3B',
    targetColor: dark ? 'rgba(255,255,255,0.38)' : '#4E5C6C',
  };
}

export function getOtifTheme(dark: boolean) {
  return dark
    ? { bg: 'rgba(245,158,11,0.08)', headBg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.30)', title: '#FBBF24', lbl: '#FCD34D', val: '#FFFFFF' }
    : { bg: '#FFF7E2', headBg: '#F9DFA2', border: '#D6AF48', title: '#8B4709', lbl: '#A55208', val: '#5C3406' };
}

export function getTraceTheme(dark: boolean) {
  return dark
    ? { bg: '#0B1017', headBg: 'rgba(125,211,252,0.10)', border: 'rgba(125,211,252,0.24)', headTxt: '#9BD2FF', mainTxt: '#FFFFFF', subTxt: '#A1A1AA', row0: '#F87171', row1: '#FBBF24', row2: '#9BD2FF', row3: '#4ADE80' }
    : { bg: '#F2F4F1', headBg: '#E4E8E4', border: '#C4CBC5', headTxt: '#5A6A75', mainTxt: '#102030', subTxt: '#5E6668', row0: '#C62828', row1: '#B65A00', row2: '#6A7680', row3: '#176B42' };
}

export function getAegisTheme(dark: boolean) {
  return dark
    ? { bg: '#0B1017', headBg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', headTxt: '#F87171', mainTxt: '#FFFFFF', subTxt: '#A1A1AA', hl1: '#F87171', hl2: '#FBBF24', hl3: '#9BD2FF' }
    : { bg: '#FBFAFA', headBg: '#F9DEDE', border: '#E8B2B2', headTxt: '#A61B1B', mainTxt: '#13202C', subTxt: '#556273', hl1: '#C62828', hl2: '#B65A00', hl3: '#0C5A7A' };
}

export function getBubbleTheme(dark: boolean) {
  return {
    dimColor: dark ? 'rgba(255,255,255,0.30)' : '#5B6668',
    divider: dark ? 'rgba(255,255,255,0.06)' : 'rgba(72,74,78,0.08)',
    bodyColor: dark ? 'rgba(255,255,255,0.82)' : '#162131',
    chartCardBg: dark ? 'rgba(255,255,255,0.03)' : 'rgba(240,242,239,0.92)',
    chartBorder: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(72,74,78,0.08)',
    operatorAck: dark ? '#60A5FA' : '#0F766E',
    cfrPillBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(72,74,78,0.05)',
    cfrPillColor: dark ? '#E2E8F0' : '#3A4757',
    senderLabelColor: dark ? 'rgba(255,255,255,0.55)' : '#364456',
    feedbackSelectedBg: dark ? 'rgba(255,255,255,0.10)' : 'rgba(72,74,78,0.06)',
    feedbackSelectedText: dark ? '#fff' : '#111',
    feedbackBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(72,74,78,0.11)',
    feedbackActiveBorder: dark ? 'rgba(255,255,255,0.18)' : 'rgba(72,74,78,0.16)',
    chartDeltaColor: dark ? '#F87171' : '#DC2626',
    chartDeltaBg: dark ? 'rgba(239,68,68,0.12)' : 'rgba(254,226,226,0.95)',
    chartDeltaBorder: dark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.24)',
    actionLinkColor: dark ? '#9BD2FF' : '#0F766E',
    pinnedColor: dark ? '#4ADE80' : '#16A34A',
    helpfulButtonColor: dark ? 'rgba(255,255,255,0.70)' : '#27384A',
  };
}

export function getCriticalBannerTheme(dark: boolean) {
  return dark
    ? { bg: 'rgba(239,68,68,0.09)', border: 'rgba(239,68,68,0.22)', label: '#F87171', sub: 'rgba(255,255,255,0.45)', btnBg: 'rgba(239,68,68,0.14)', btnColor: '#FCA5A5', btnBorder: 'rgba(239,68,68,0.30)', dim: 'rgba(255,255,255,0.22)' }
    : { bg: 'rgba(255,242,241,0.96)', border: 'rgba(198,40,40,0.18)', label: '#A61B1B', sub: '#4F5B68', btnBg: 'rgba(198,40,40,0.08)', btnColor: '#8A1717', btnBorder: 'rgba(198,40,40,0.19)', dim: '#6E7A88' };
}
