import { CSSProperties, memo, useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAppStore } from '../../store/useAppStore';
import { KAIROS_CHARTS } from '../../lib/kairosCharts';
import {
  getBreakdownSeverityColors,
  getMetricSeverityColors,
  getSignedRecordStatusColors,
  getSignedRecordTheme,
  parseHighlightedText,
} from '../../services/kairos/messageFormatting';
import { getOtifPanelRows, getTracePanelRows } from '../../services/kairos/panelData';
import { WidgetRenderer } from '../widget/WidgetRenderer';
import { useKairos } from './KairosContext';
import type { KairosMessage, KairosReport } from '../../types/kairos';
import type { KairosChartConfig, KairosChartMap } from '../../types/charts';
import {
  getAegisTheme,
  getBubbleTheme,
  getCriticalBannerTheme,
  getOtifTheme,
  getPillStyles,
  getReportCardTheme,
  getSeverityTone,
  getStatusColors,
  getTraceTheme,
} from './threadTheme';
import { buildBubbleRoleState } from './threadViewModel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const CHARTS = KAIROS_CHARTS as KairosChartMap;

type BreakdownRow = {
  label: string;
  value: string;
  detail: string;
  delta: string | null;
  severity: string;
};

type MetricRow = {
  label: string;
  value: string;
  sub?: string;
  severity?: string;
  bar?: boolean;
};

type SignedRecord = {
  recordId: string;
  batch: string;
  line: string;
  status: string;
  integrity: string;
  createdAt: string;
  by: string;
};

type BubbleMessage = KairosMessage & {
  bullets?: string[];
  confidence?: number;
  signedRecord?: SignedRecord;
};

type ReportShape = KairosReport & {
  pill: 'deviation' | 'batch' | 'shift';
};

type LiveDataProvider = (tag: string) => number | undefined;

function ReportCard({ report, dark }: { report: ReportShape; dark: boolean }) {
  const chartRef = useRef<any>(null);
  const ps = getPillStyles(dark)[report.pill];
  const sc = getStatusColors(dark);
  const theme = getReportCardTheme(dark);
  const rc = report.chartKey ? (CHARTS[report.chartKey] as KairosChartConfig) : null;
  const RC = rc?.type === 'bar' ? Bar : Line;

  const handlePrint = () => {
    const chartImg = chartRef.current ? chartRef.current.toBase64Image('image/png', 1) : null;
    const w = window.open('', '_blank', 'width=820,height=720');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${report.title}</title>
<style>body{font-family:system-ui,sans-serif;padding:28px;font-size:12px;color:#111;}
table{width:100%;border-collapse:collapse;}th,td{padding:5px 8px;text-align:left;border-bottom:1px solid #e5e7eb;}
th{font-size:9px;text-transform:uppercase;color:#6b7280;}h2{margin:0 0 4px;font-size:15px;}
p{margin:6px 0;line-height:1.6;}.pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;border-radius:3px;margin-bottom:4px;}
.chart-wrap{margin:10px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;}
.chart-wrap img{width:100%;display:block;}
.chart-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;}
</style></head><body>
<div class="pill" style="background:${getPillStyles(false)[report.pill].bg};color:${getPillStyles(false)[report.pill].color};border:1px solid ${getPillStyles(false)[report.pill].border}">${report.type}</div>
<h2>${report.title}</h2>
<p style="font-size:10px;color:#6b7280">${report.meta.join(' · ')}</p>
${report.sections.map((section) => `<p><strong>${section.label}:</strong> ${section.text}</p>`).join('')}
${chartImg && rc ? `<div class="chart-label">${rc.label}</div><div class="chart-wrap"><img src="${chartImg}" /></div>` : ''}
<table><thead><tr><th>Tag</th><th>Parameter</th><th>Current</th><th>Target</th><th>Status</th></tr></thead>
<tbody>${report.table.map((row) => { const col = getStatusColors(false)[row.status as keyof ReturnType<typeof getStatusColors>] || '#111'; return `<tr><td style="font-family:monospace;color:#1d4ed8;font-weight:700">${row.tag}</td><td>${row.name}</td><td style="color:${col};font-weight:600">${row.current}</td><td style="color:#6b7280">${row.target}</td><td style="color:${col};font-weight:600;text-transform:capitalize">${row.status}</td></tr>`; }).join('')}
</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div
      className="kairos-card kairos-card-report"
      style={{
        '--kai-card-bg': theme.cardBg,
        '--kai-card-border': theme.cardBorder,
        '--kai-card-head-border': theme.headBorder,
        '--kai-card-title': theme.titleColor,
        '--kai-card-meta': theme.metaColor,
        '--kai-card-label': theme.labelColor,
        '--kai-card-body': theme.bodyColor,
        '--kai-card-print-bg': theme.printBg,
        '--kai-card-print-border': theme.printBorder,
        '--kai-card-print-color': theme.printColor,
        '--kai-card-chart-bg': theme.chartBg,
        '--kai-card-chart-border': theme.chartBorder,
        '--kai-report-pill-bg': ps.bg,
        '--kai-report-pill-text': ps.color,
        '--kai-report-pill-border': ps.border,
      } as CSSProperties}
    >
      <div className="kairos-card-report-head">
        <div>
          <div className="kairos-card-report-pill">{report.type}</div>
          <div className="kairos-card-report-title">{report.title}</div>
          <div className="kairos-card-report-meta">
            {report.meta.map((m, i) => <span key={i}>{i > 0 ? '· ' : ''}{m}</span>)}
          </div>
        </div>
        <button onClick={handlePrint} className="kairos-card-report-print">Print</button>
      </div>
      <div className="kairos-card-report-body">
        {report.sections.map((section, i) => (
          <div key={i}>
            <div className="kairos-card-report-label">{section.label}</div>
            <div className="kairos-card-report-text">{section.text}</div>
          </div>
        ))}
        {rc && RC && (
          <div>
            <div className="kairos-card-report-label">{rc.label}</div>
            <div className="kairos-card-report-chart">
              <RC ref={chartRef} data={rc.data as any} options={rc.getOptions(dark) as any} />
            </div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Tag', 'Parameter', 'Current', 'Target', 'Status'].map((h) => (
            <th key={h} style={{ textAlign: 'left', padding: '4px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.thColor, borderBottom: `1px solid ${theme.tbBorder}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>{report.table.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < report.table.length - 1 ? `1px solid ${theme.tbBorder}` : 'none' }}>
              <td style={{ padding: '4px 6px', fontFamily: '"IBM Plex Mono",monospace', fontSize: 10, fontWeight: 700, color: theme.tagColor }}>{row.tag}</td>
              <td style={{ padding: '4px 6px', fontSize: 11, color: theme.nameColor }}>{row.name}</td>
              <td style={{ padding: '4px 6px', fontWeight: 600, color: sc[row.status as keyof typeof sc] }}>{row.current}</td>
              <td style={{ padding: '4px 6px', color: theme.targetColor }}>{row.target}</td>
              <td style={{ padding: '4px 6px', fontWeight: 600, color: sc[row.status as keyof typeof sc], textTransform: 'capitalize' }}>{row.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function OTIFAlertCard({ ts }: { ts: string }) {
  const dark = useAppStore((state) => state.dark);
  const theme = getOtifTheme(dark);
  const rows = getOtifPanelRows();
  return (
    <div className="kairos-card kairos-card-otif" style={{ '--kai-otif-bg': theme.bg, '--kai-otif-border': theme.border, '--kai-head-bg': theme.headBg, '--kai-head-border': theme.border, '--kai-head-title': theme.title, '--kai-otif-label': theme.lbl, '--kai-otif-value': theme.val } as CSSProperties}>
      <div className="kairos-card-otif-head">
        <span className="kairos-card-otif-title">⚠ OTIF Alert — Line 1</span>
        {ts && <span className="kairos-card-otif-time">Raised {ts}</span>}
        <span className="kairos-card-otif-tail">SAP · ERP</span>
      </div>
      <div className="kairos-card-otif-body">
        {rows.map(({ label, value }) => (
          <div key={label} className="kairos-card-otif-row">
            <span className="kairos-card-otif-key">{label}</span>
            <span className="kairos-card-otif-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TracePanel() {
  const dark = useAppStore((state) => state.dark);
  const theme = getTraceTheme(dark);
  const [polled, setPolled] = useState(847);
  useEffect(() => {
    const id = setInterval(() => setPolled((p) => Math.floor(Math.random() * 600 + 200)), 1800);
    return () => clearInterval(id);
  }, []);

  const rows = getTracePanelRows(polled, theme);

  return (
    <div className="kairos-card kairos-card-trace" style={{ '--kai-trace-bg': theme.bg, '--kai-trace-border': theme.border, '--kai-head-bg': theme.headBg, '--kai-head-border': theme.border, '--kai-head-title': theme.headTxt, '--kai-trace-main': theme.mainTxt, '--kai-trace-sub': theme.subTxt, '--kai-trace-row-border': dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } as CSSProperties}>
      <div className="kairos-card-trace-head">
        <span className="kairos-card-trace-title">SIGNAL TRACE — Prediction Anchor</span>
        <span className="kairos-card-trace-tail">FT-1101 · live</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="kairos-card-trace-row" style={{ '--kai-trace-row-color': row.col } as CSSProperties}>
          <div className="kairos-card-trace-main">
            <span className="kairos-card-trace-tag">{row.tag}</span>
            <span className="kairos-card-trace-main-text">{row.main}</span>
          </div>
          <div className="kairos-card-trace-sub">
            <span className="kairos-card-trace-icon">{row.icon}</span>
            <span className="kairos-card-trace-sub-text">{row.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AegisRejection({ msg }: { msg: BubbleMessage }) {
  const dark = useAppStore((state) => state.dark);
  const theme = getAegisTheme(dark);

  return (
    <div className="kairos-card kairos-card-aegis" style={{ '--kai-trace-bg': theme.bg, '--kai-trace-border': theme.border, '--kai-head-bg': theme.headBg, '--kai-head-border': theme.border, '--kai-head-title': theme.headTxt, '--kai-aegis-main': theme.mainTxt, '--kai-aegis-sub': theme.subTxt, '--kai-aegis-hl1': theme.hl1, '--kai-aegis-hl2': theme.hl2, '--kai-aegis-hl3': theme.hl3 } as CSSProperties}>
      <div className="kairos-card-aegis-head">
        <span style={{ fontSize: 10 }}>🛡</span>
        <span className="kairos-card-aegis-title">AEGIS SHIELD · REJECTED</span>
      </div>
      <div className="kairos-card-aegis-body">
        <div className="kairos-card-aegis-lead">{msg.aegisTarget} does not contain a <span className="kairos-card-aegis-hl2">{msg.aegisField}</span> sensor in the validated Unified Namespace <span className="kairos-card-aegis-subtle">(v3.2.1 · PKG-1)</span>.</div>
        <div className="kairos-card-aegis-copy">Cannot fabricate data for unregistered hardware nodes. All KairOS writes are bound to verified physical sensors.</div>
        <div className="kairos-card-aegis-sensors-label">Validated sensors on {msg.aegisTarget}:</div>
        <div className="kairos-card-aegis-sensors">{msg.aegisValidSensors}</div>
      </div>
    </div>
  );
}

function HighlightText({ text, dark }: { text?: string; dark: boolean }) {
  const parts = parseHighlightedText(text);
  if (!parts.length) return null;

  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === 'strong') {
          return <span key={i} className="kairos-highlight-strong" style={{ '--kai-highlight-strong': dark ? '#9BD2FF' : '#0F766E' } as CSSProperties}>{part.value}</span>;
        }

        if (part.kind === 'token') {
          return <span key={i} className="kairos-highlight-token" style={{ '--kai-highlight-token-text': dark ? '#FBBF24' : '#0F172A', '--kai-highlight-token-bg': dark ? 'rgba(251,191,36,0.1)' : '#EEF4F7', '--kai-highlight-token-border': dark ? 'rgba(251,191,36,0.2)' : 'rgba(15,23,42,0.12)' } as CSSProperties}>
            <span className="kairos-highlight-token-icon">{part.icon}</span>
            {part.value}
          </span>;
        }
        return part.value;
      })}
    </>
  );
}

function KairosIcon({ size = 14, color = 'rgba(255,255,255,0.8)' }: { size?: number; color?: string }) {
  const s = size / 14;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
      <path d="M 74 26 A 34 34 0 1 0 74 74" stroke={color} strokeWidth={8 * s} fill="none" strokeLinecap="round" />
      <line x1="16" y1="50" x2="37" y2="50" stroke={color} strokeWidth={8 * s} strokeLinecap="round" />
      <circle cx="50" cy="50" r={8 * s} fill="#FF5000" />
      <circle cx="63" cy="50" r={3 * s} fill={color} />
      <circle cx="72" cy="50" r={3 * s} fill={color} />
      <circle cx="81" cy="50" r={3 * s} fill={color} />
    </svg>
  );
}

function BreakdownTable({ rows, dark }: { rows: BreakdownRow[]; dark: boolean }) {
  const sev = getBreakdownSeverityColors(dark);
  return (
    <table className="kairos-breakdown-table">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="kairos-breakdown-row" style={{ '--kai-breakdown-border': dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', '--kai-breakdown-label': dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.38)', '--kai-breakdown-detail': dark ? 'rgba(255,255,255,0.45)' : '#5A6675', '--kai-breakdown-value-color': sev[row.severity] || sev.info } as CSSProperties}>
            <td className="kairos-breakdown-label">{row.label}</td>
            <td className="kairos-breakdown-value">
              <span className="kairos-breakdown-value-main">{row.value}</span>
              {row.delta && <span className="kairos-breakdown-value-delta">{row.delta}</span>}
            </td>
            <td className="kairos-breakdown-detail">{row.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SignedRecordCard({ record, dark }: { record: SignedRecord; dark: boolean }) {
  const colors = getSignedRecordTheme(dark);
  const localStatusColor = getSignedRecordStatusColors(dark);
  return (
    <div className="kairos-signed-record" style={{ '--kai-signed-bg': colors.bg, '--kai-signed-border': colors.border, '--kai-signed-label': colors.label, '--kai-signed-value': colors.value, '--kai-signed-meta': colors.meta, '--kai-signed-link': colors.link } as CSSProperties}>
      <div className="kairos-signed-grid">
        {[{ l: 'Record ID', v: record.recordId }, { l: 'Batch', v: record.batch }, { l: 'Line', v: record.line }, { l: 'Status', v: record.status, col: localStatusColor[record.status] }].map((field, i) => (
          <div key={i}>
            <div className="kairos-signed-label">{field.l}</div>
            <div className="kairos-signed-value" style={field.col ? { color: field.col } : undefined}>{field.v}</div>
          </div>
        ))}
      </div>
      <div className="kairos-signed-foot">
        <div className="kairos-signed-meta">
          <span>Integrity: {record.integrity} ✓</span>
          <span>Created: {record.createdAt}</span>
          <span>By: {record.by}</span>
        </div>
        <button className="kairos-signed-link">
          View audit trail ↗
        </button>
      </div>
    </div>
  );
}

function MetricsGrid({ metrics, dark }: { metrics: MetricRow[]; dark: boolean }) {
  const sev = getMetricSeverityColors(dark);
  return (
    <div className="kairos-metrics-grid" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)},1fr)` }}>
      {metrics.map((metric, i) => (
        <div key={i} className="kairos-metric-card" style={{ '--kai-metric-bg': dark ? 'rgba(255,255,255,0.04)' : 'rgba(241,245,249,0.92)', '--kai-metric-label': dark ? 'rgba(255,255,255,0.35)' : '#526071', '--kai-metric-sub': dark ? 'rgba(255,255,255,0.40)' : '#5A6675', '--kai-metric-bar-bg': dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)', '--kai-metric-value-color': sev[metric.severity || 'info'] || sev.info, '--kai-metric-bar-width': metric.value } as CSSProperties}>
          <div className="kairos-metric-label">{metric.label}</div>
          <div className="kairos-metric-value">{metric.value}</div>
          {metric.sub && <div className="kairos-metric-sub">{metric.sub}</div>}
          {metric.bar && <div className="kairos-metric-bar"><div className="kairos-metric-bar-fill" /></div>}
        </div>
      ))}
    </div>
  );
}

const Bubble = memo(function Bubble({
  msg,
  onCmd,
  dark,
  liveDataProvider,
  liveIds,
}: {
  msg: BubbleMessage;
  onCmd: (cmd: string) => void;
  dark: boolean;
  liveDataProvider: LiveDataProvider;
  liveIds: string[];
}) {
  const roleState = buildBubbleRoleState(msg);
  const { severity, isKairos, isOperator, isSystem, isSigned, cfr, senderLabel, badgeLabel } = roleState;
  const cfg = msg.chartKey ? (CHARTS[msg.chartKey] as KairosChartConfig) : null;
  const ChartComp = cfg?.type === 'bar' ? Bar : Line;
  const pinnedCharts = useAppStore((state) => state.pinnedCharts);
  const pinChart = useAppStore((state) => state.pinChart);
  const unpinChart = useAppStore((state) => state.unpinChart);
  const addSpatialWidget = useAppStore((state) => state.addSpatialWidget);
  const isPinned = !!msg.chartKey && pinnedCharts.some((item) => item.id === msg.id);
  const [widgetPinned, setWidgetPinned] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sigExpanded, setSigExpanded] = useState(false);
  const theme = getBubbleTheme(dark);

  useEffect(() => {
    if (msg.urgent && isKairos) {
      try {
        const audioCtor = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new audioCtor();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {}
    }
  }, [msg.urgent, isKairos]);

  const sc = getSeverityTone(dark, severity);
  const accentColor = isSystem ? '#22C55E'
    : isOperator ? (dark ? '#60A5FA' : '#2563EB')
      : isSigned ? '#A855F7'
        : sc?.accent || '#3B82F6';
  const avatar = isSystem ? { bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.30)', color: '#22C55E', label: 'S' }
    : isOperator ? { bg: 'rgba(37,99,235,0.14)', border: 'rgba(37,99,235,0.30)', color: '#3B82F6', label: 'OP' }
      : isSigned ? { bg: 'rgba(168,85,247,0.14)', border: 'rgba(168,85,247,0.30)', color: '#A855F7', label: '✦' }
        : { bg: dark ? 'rgba(42,241,229,0.12)' : 'rgba(2,132,199,0.10)', border: dark ? 'rgba(42,241,229,0.28)' : 'rgba(2,132,199,0.25)', color: dark ? '#2AF1E5' : '#0369A1', label: 'icon' };
  const badgeColor = isSystem ? { text: '#22C55E', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)' }
    : isOperator ? { text: dark ? '#60A5FA' : '#2563EB', bg: 'rgba(37,99,235,0.10)', border: 'rgba(37,99,235,0.22)' }
      : isSigned ? { text: '#A855F7', bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)' }
        : sc;

  return (
    <div
      className="kairos-bubble"
      style={{
        '--kai-bubble-accent': `${accentColor}${isOperator || (isKairos && severity === 'ADVISORY') ? '50' : 'BB'}`,
        '--kai-bubble-dim': theme.dimColor,
        '--kai-bubble-sender': theme.senderLabelColor,
        '--kai-bubble-cfr-bg': theme.cfrPillBg,
        '--kai-bubble-cfr-text': theme.cfrPillColor,
        '--kai-bubble-ack': theme.operatorAck,
        '--kai-bubble-body': theme.bodyColor,
        '--kai-bubble-confidence': dark ? '#4ADE80' : '#16A34A',
        '--kai-bubble-chart-delta': theme.chartDeltaColor,
        '--kai-bubble-chart-delta-bg': theme.chartDeltaBg,
        '--kai-bubble-chart-delta-border': theme.chartDeltaBorder,
        '--kai-bubble-chart-bg': theme.chartCardBg,
        '--kai-bubble-chart-border': theme.chartBorder,
        '--kai-bubble-feedback-bg': theme.feedbackSelectedBg,
        '--kai-bubble-feedback-text': theme.helpfulButtonColor,
        '--kai-bubble-feedback-border': theme.feedbackBorder,
        '--kai-bubble-feedback-active-border': theme.feedbackActiveBorder,
        '--kai-bubble-feedback-selected-text': theme.feedbackSelectedText,
        '--kai-bubble-divider': theme.divider,
        '--kai-bubble-action-color': theme.actionLinkColor,
        '--kai-bubble-pinned': theme.pinnedColor,
        '--kai-bubble-head-gap': isOperator ? '4px' : '6px',
        '--kai-avatar-bg': avatar.bg,
        '--kai-avatar-border': avatar.border,
        '--kai-avatar-color': avatar.color,
        '--kai-badge-bg': badgeColor?.bg,
        '--kai-badge-text': badgeColor?.text,
        '--kai-badge-border': badgeColor?.border,
      } as CSSProperties}
    >
      <div className="kairos-bubble-time">
        <span className="kairos-bubble-timecode">{msg.ts}</span>
      </div>
      <div className="kairos-bubble-avatar">
        {avatar.label === 'icon'
          ? <KairosIcon size={13} color={dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)'} />
          : <span className={`kairos-bubble-avatar-label ${avatar.label === 'OP' ? 'is-operator' : 'is-default'}`}>{avatar.label}</span>}
      </div>
      <div className="kairos-bubble-main">
        <div className="kairos-bubble-head">
          <span className="kairos-bubble-badge">{badgeLabel}</span>
          {senderLabel && <span className="kairos-bubble-sender">{senderLabel}</span>}
          {cfr && <span className="kairos-bubble-cfr">21-CFR</span>}
          {isOperator && <span className="kairos-bubble-operator-ack">✓</span>}
          {isKairos && !isSigned && (
            <span onClick={() => setSigExpanded((value) => !value)} className="kairos-bubble-sig">
              {sigExpanded ? msg.sig : '···'}
            </span>
          )}
        </div>

        {msg.text && (
          <div className="kairos-bubble-text">
            <HighlightText text={msg.text} dark={dark} />
          </div>
        )}

        {msg.bullets && (
          <ul className="kairos-bubble-bullets">
            {msg.bullets.map((bullet, i) => (
              <li key={i} className="kairos-bubble-bullet">{bullet}</li>
            ))}
          </ul>
        )}

        {msg.confidence != null && (
          <div className="kairos-bubble-confidence">
            <span className="kairos-bubble-confidence-label">Confidence:</span>
            <span className="kairos-bubble-confidence-value">{msg.confidence}%</span>
          </div>
        )}

        {msg.breakdown && <div className="kairos-bubble-block"><BreakdownTable rows={msg.breakdown as BreakdownRow[]} dark={dark} /></div>}
        {msg.metrics && <div className="kairos-bubble-block"><MetricsGrid metrics={msg.metrics as MetricRow[]} dark={dark} /></div>}
        {msg.signedRecord && <div className="kairos-bubble-block"><SignedRecordCard record={msg.signedRecord} dark={dark} /></div>}

        {msg.widget && (
          <div className="kairos-bubble-block">
            <WidgetRenderer
              payload={msg.widget}
              dark={dark}
              liveDataProvider={liveDataProvider}
              liveTagIds={liveIds}
              onAction={(data: any) => {
                if (data?.requiresAuth) onCmd(`execute override ${data.machineId || ''} ${data.action || ''}`);
              }}
            />
          </div>
        )}

        {msg.otifAlert && <div className="kairos-bubble-block"><OTIFAlertCard ts={msg.ts} /></div>}
        {msg.aegisTarget && <div className="kairos-bubble-block"><AegisRejection msg={msg} /></div>}
        {msg.tracePanel && <div className="kairos-bubble-block"><TracePanel /></div>}
        {msg.report && <div className="kairos-bubble-block"><ReportCard report={msg.report as ReportShape} dark={dark} /></div>}

        {cfg && ChartComp && (
          <div className="kairos-bubble-block">
            <div className="kairos-bubble-chart-head">
              <span className="kairos-bubble-chart-label">{cfg.label}</span>
              {msg.chartKey === 'oee' && <span className="kairos-bubble-chart-delta">−14.0 pp</span>}
            </div>
            <div className={`kairos-bubble-chart-card ${msg.chartKey === 'oee' ? 'is-oee' : 'is-default'}`}>
              <ChartComp data={cfg.data as any} options={cfg.getOptions(dark) as any} />
            </div>
          </div>
        )}

        {isSystem ? (
          <div className="kairos-bubble-feedback-row">
            <span className="kairos-bubble-feedback-label">Was this helpful?</span>
            {[['👍', 'yes'], ['👎', 'no']].map(([icon, key]) => (
              <button key={key} onClick={() => setFeedback(key)} className={`kairos-bubble-feedback-btn${feedback === key ? ' is-selected' : ''}`}>{icon} {key.charAt(0).toUpperCase() + key.slice(1)}</button>
            ))}
          </div>
        ) : isKairos ? (
          <div className="kairos-bubble-feedback-inline">
            {[['correct', '✓ Correct'], ['incorrect', '✕ Incorrect'], ['unclear', '? Unclear']].map(([key, label]) => (
              <button key={key} onClick={() => setFeedback(key)} className={`kairos-bubble-feedback-btn is-kairos${feedback === key ? ' is-selected' : ''}`}>{label}</button>
            ))}
            <div className="kairos-bubble-actions">
              {cfg && msg.chartKey && (
                <button onClick={() => isPinned ? unpinChart(msg.id) : pinChart({ id: msg.id, title: cfg.label || msg.chartKey, chartKey: msg.chartKey })} className={`kairos-bubble-action-link${isPinned ? ' is-pinned' : ''}`}>{isPinned ? '✓ KPI' : '↗ KPI'}</button>
              )}
              {msg.actions?.map((action, i) => {
                const isPinAction = action.cmd === 'pin widget';
                const pinned = isPinAction && widgetPinned;
                return (
                  <button key={i} onClick={() => {
                    if (isPinAction) {
                      const widget = msg.widget as any;
                      if (!widgetPinned && widget?.spatialBinding) {
                        addSpatialWidget({ id: `widget-${widget.type}-${widget.spatialBinding.entityId}`, payload: widget });
                        setWidgetPinned(true);
                      }
                    } else {
                      onCmd(action.cmd);
                    }
                  }} className={`kairos-bubble-action-link${pinned ? ' is-pinned' : ''}`}>{pinned ? '✓ Pinned' : action.label}</button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

function CriticalBanner({ msg, dark, onView }: { msg?: BubbleMessage; dark: boolean; onView: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (!msg || dismissed) return null;
  const bd = msg.breakdown as BreakdownRow[] | undefined;
  const theme = getCriticalBannerTheme(dark);
  return (
    <div
      className="kairos-critical-banner"
      style={{
        '--kai-critical-bg': theme.bg,
        '--kai-critical-border': theme.border,
        '--kai-critical-label': theme.label,
        '--kai-critical-sub': theme.sub,
        '--kai-critical-btn-bg': theme.btnBg,
        '--kai-critical-btn-border': theme.btnBorder,
        '--kai-critical-btn-color': theme.btnColor,
        '--kai-critical-dim': theme.dim,
        '--kai-critical-title-gap': bd ? '3px' : '0',
      } as CSSProperties}
    >
      <span className="kairos-critical-banner-icon">⬡</span>
      <div className="kairos-critical-banner-main">
        <div className="kairos-critical-banner-title">Critical Alert · Line 1 · BM-1101</div>
        {bd && (
          <div className="kairos-critical-banner-meta">
            {bd.map((row, i) => (
              <span key={i} className="kairos-critical-banner-meta-item">
                <span className="kairos-critical-banner-meta-key">{row.label}</span>{' '}{row.value}{row.delta ? <span>{' '}{row.delta}</span> : null}
              </span>
            ))}
          </div>
        )}
      </div>
      <button onClick={onView} className="kairos-critical-banner-btn">
        View analysis ↓
      </button>
      <button onClick={() => setDismissed(true)} className="kairos-critical-banner-close">✕</button>
    </div>
  );
}

export function KairosThread() {
  const { messages, thinking, threadRef, dark, liveDataProvider, liveIds, submit } = useKairos();
  const criticalMsg = messages.find((message) => message.role === 'kairos' && message.urgent) as BubbleMessage | undefined;

  return (
    <div className="kairos-thread-shell">
      <CriticalBanner msg={criticalMsg} dark={dark} onView={() => { if (threadRef.current) threadRef.current.scrollTop = 0; }} />
      <div ref={threadRef} className="kai-thread kairos-thread-scroll">
        {messages.map((message) => <Bubble key={message.id} msg={message as BubbleMessage} onCmd={submit} dark={dark} liveDataProvider={liveDataProvider as LiveDataProvider} liveIds={liveIds} />)}
        {thinking && (
          <div className="kairos-thinking">
            <div className="kairos-thinking-row">
              {[0, 1, 2].map((i) => <div key={i} className="kairos-thinking-dot" style={{ animation: `kaiPulse 1.2s ${i * 0.22}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
