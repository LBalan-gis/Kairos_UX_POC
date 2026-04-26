export type HighlightSegment =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'token'; value: string; icon: string };

const HIGHLIGHT_REGEX = /(\*\*.*?\*\*|\b[A-Z]{2,4}-\d+\b|\b\d+(?:\.\d+)?\s*(?:%|N|bpm|ms|units)\b)/g;

export function parseHighlightedText(text?: string): HighlightSegment[] {
  if (!text) return [];

  return text
    .split(HIGHLIGHT_REGEX)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { kind: 'strong', value: part.slice(2, -2) } as HighlightSegment;
      }

      const isMachine = /^[A-Z]{2,4}-\d+$/.test(part);
      const isMetric = /^\d+(?:\.\d+)?\s*(?:%|N|bpm|ms|units)$/.test(part);

      if (isMachine || isMetric) {
        return {
          kind: 'token',
          value: part,
          icon: isMachine ? '⬡' : 'Σ',
        } as HighlightSegment;
      }

      return { kind: 'text', value: part } as HighlightSegment;
    });
}

export function getBreakdownSeverityColors(dark: boolean): Record<string, string> {
  return {
    critical: dark ? '#F87171' : '#DC2626',
    warning: dark ? '#FBBF24' : '#D97706',
    ok: dark ? '#4ADE80' : '#16A34A',
    info: dark ? '#67E8F9' : '#0369A1',
  };
}

export function getMetricSeverityColors(dark: boolean): Record<string, string> {
  return getBreakdownSeverityColors(dark);
}

export function getSignedRecordTheme(dark: boolean) {
  return dark
    ? {
        bg: 'rgba(168,85,247,0.06)',
        border: 'rgba(168,85,247,0.22)',
        label: 'rgba(255,255,255,0.35)',
        value: 'rgba(255,255,255,0.85)',
        meta: 'rgba(255,255,255,0.38)',
        link: '#C084FC',
      }
    : {
        bg: 'rgba(168,85,247,0.04)',
        border: 'rgba(168,85,247,0.16)',
        label: 'rgba(0,0,0,0.35)',
        value: 'rgba(0,0,0,0.80)',
        meta: 'rgba(0,0,0,0.38)',
        link: '#7C3AED',
      };
}

export function getSignedRecordStatusColors(dark: boolean): Record<string, string> {
  return {
    'Awaiting QA signature': dark ? '#FBBF24' : '#D97706',
    Approved: '#22C55E',
    Rejected: '#EF4444',
  };
}
