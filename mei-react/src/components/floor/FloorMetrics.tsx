import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { OpenClawTerminal } from './OpenClawTerminal';
import './FloorMetrics.css';

// ── Live ticker hook ──────────────────────────────────────────────────────────
interface MetricConfig { base: number; amplitude: number; }

function useLiveMetrics(configs: MetricConfig[], intervalMs = 2000): number[] {
  const [vals, setVals] = useState<number[]>(() => configs.map(c => c.base));
  const cfgRef = useRef(configs);
  useEffect(() => { cfgRef.current = configs; });
  useEffect(() => {
    const id = setInterval(() => {
      setVals(cfgRef.current.map(c => +(c.base + (Math.random() - 0.5) * 2 * c.amplitude).toFixed(1)));
    }, intervalMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
  return vals;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Severity = 'critical' | 'warning' | 'offline';

interface Alarm {
  id: string;
  label: string;
  severity: Severity;
  msg: string;
}

interface LineData {
  accent: string;
  badge: string;
  badgeBg: string;
  badgeBgSolid: string;
  lineName: string;
  oee: number;
  throughput: number;
  batchId: string;
  packed: number;
  target: number;
  correction: { action: string; detail: string } | null;
}

interface KpiLine {
  badge: string;
  badgeBg: string;
  badgeBgSolid: string;
  oeeBase: number;
  oeeCol: string;
  avail: number;
  perf: number;
  qual: number;
  otifRisk: boolean;
}

// ── Severity colours ──────────────────────────────────────────────────────────
const SEV_COL: Record<Severity, string> = {
  critical: '#EF4444',
  warning:  '#F59E0B',
  offline:  '#6B7280',
};

const ACTIVE_ALARMS: Alarm[] = [
  { id: 'ctn_1101', label: 'CTN-1101', severity: 'critical', msg: 'Starved · queue backing up' },
  { id: 'bf_1101',  label: 'BF-1101',  severity: 'warning',  msg: 'Film tension 34 N → 42 N' },
];

const LINE_DATA: LineData[] = [
  {
    accent: '#F59E0B', badge: 'L1', badgeBg: 'rgba(245,158,11,0.25)', badgeBgSolid: '#D97706', lineName: 'Line 1',
    oee: 78.4, throughput: 218, batchId: 'PH-2026-018 · SKU 41829',
    packed: 1120, target: 2960,
    correction: { action: 'Adjust FT-1101 → 42 N', detail: '97% confidence · recovers in 12 min · saves £29K' },
  },
  {
    accent: '#10B981', badge: 'L2', badgeBg: 'rgba(16,185,129,0.22)', badgeBgSolid: '#059669', lineName: 'Line 2',
    oee: 93.4, throughput: 224, batchId: 'PH-2026-019 · SKU 41830',
    packed: 2210, target: 2960,
    correction: null,
  },
];

const KPI_LINES: KpiLine[] = [
  {
    badge: 'L1', badgeBg: 'rgba(245,158,11,0.25)', badgeBgSolid: '#D97706',
    oeeBase: 78.4, oeeCol: '#F59E0B',
    avail: 91.5, perf: 90.8, qual: 94.3,
    otifRisk: true,
  },
  {
    badge: 'L2', badgeBg: 'rgba(16,185,129,0.22)', badgeBgSolid: '#059669',
    oeeBase: 93.4, oeeCol: '#10B981',
    avail: 98.1, perf: 96.2, qual: 98.9,
    otifRisk: false,
  },
];

// ── SubBar ────────────────────────────────────────────────────────────────────
function SubBar({ label, val }: { label: string; val: number }) {
  const col = val >= 95 ? 'var(--normal)' : val >= 90 ? 'var(--warning)' : 'var(--critical)';
  return (
    <div className="fm-subbar">
      <div className="fm-subbar-head">
        <span className="fm-subbar-lbl">{label}</span>
        <span className="fm-subbar-val">{val}%</span>
      </div>
      <div className="fm-subbar-track">
        <div className="fm-subbar-fill" style={{ width: `${val}%`, background: col }} />
      </div>
    </div>
  );
}

// ── OEEOTIFWidget ─────────────────────────────────────────────────────────────
function OEEOTIFWidget() {
  const dark = useAppStore(s => s.dark);
  const [l1Oee, l2Oee] = useLiveMetrics(
    [{ base: 78.4, amplitude: 0.3 }, { base: 93.4, amplitude: 0.2 }],
    2800
  );
  const live = [l1Oee, l2Oee];
  return (
    <div style={{ width: '100%', pointerEvents: 'auto' }}>
      <div className="fm-kpi-header">
        <span className="fm-kpi-label">KPI · LIVE</span>
        <span className="fm-kpi-sub">OEE · OTIF</span>
      </div>
      {KPI_LINES.map((l, i) => (
        <div key={l.badge} className="fm-kpi-row">
          <div className="fm-kpi-row-head">
            <div className="fm-line-badge" style={{ background: dark ? l.badgeBg : l.badgeBgSolid }}>{l.badge}</div>
            <span className="fm-oee-val" style={{ color: l.oeeCol }}>{live[i].toFixed(1)}%</span>
            <span className="fm-oee-unit">OEE</span>
          </div>
          <div className="fm-subbar-row">
            <SubBar label="A" val={l.avail} />
            <SubBar label="P" val={l.perf} />
            <SubBar label="Q" val={l.qual} />
          </div>
        </div>
      ))}
      <div className="fm-otif-banner">
        <span className="fm-otif-icon">⚠</span>
        <div>
          <div className="fm-otif-title">OTIF RISK · Line 1</div>
          <div className="fm-otif-body">
            Physics engine predicts miss of Friday 17:00 SAP target if uncorrected
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LineMetrics ───────────────────────────────────────────────────────────────
function LineMetrics({ line }: { line: LineData }) {
  const dark = useAppStore(s => s.dark);
  const [liveOee, liveBpm] = useLiveMetrics(
    [{ base: line.oee, amplitude: 0.5 }, { base: line.throughput, amplitude: 1.2 }],
    2000
  );
  const progress = Math.round((line.packed / line.target) * 100);
  return (
    <div className="fm-line">
      <div className="fm-line-head">
        <div className="fm-line-badge" style={{ background: dark ? line.badgeBg : line.badgeBgSolid }}>{line.badge}</div>
        <span className="fm-line-name">{line.lineName}</span>
        <div style={{ flex: 1 }} />
        <span className="fm-line-oee">{liveOee}</span>
        <span className="fm-line-pct">%</span>
      </div>
      <div className="fm-line-target-row">
        <span className="fm-line-target-lbl">Target</span>
        <span className="fm-line-target-val" style={{ color: line.accent }}>{line.packed.toLocaleString()} / {line.target.toLocaleString()}</span>
      </div>
      <div className="fm-line-track">
        <div className="fm-line-fill" style={{ width: `${progress}%`, background: line.accent }} />
      </div>
      <div className="fm-line-batch">
        {line.batchId} · <span className="fm-line-bpm">{liveBpm}</span> bpm
      </div>
      {line.correction && (
        <div className="fm-correction">
          <div className="fm-correction-action">{line.correction.action}</div>
          <div className="fm-correction-detail">{line.correction.detail}</div>
        </div>
      )}
    </div>
  );
}

// ── OpsCard ───────────────────────────────────────────────────────────────────
interface OpsCardProps {
  onSelect?: (id: string) => void;
  offlineAlarms?: Alarm[];
  activeMachineId?: string | null;
}

function OpsCard({ onSelect, offlineAlarms = [], activeMachineId }: OpsCardProps) {
  const allAlarms = [...ACTIVE_ALARMS, ...offlineAlarms];
  const topCol = SEV_COL[allAlarms[0]?.severity] ?? SEV_COL.warning;

  return (
    <div style={{ width: '100%' }}>
      <div className="fm-alarms">
        <div className="fm-alarms-head">
          <div className="fm-alarms-dot" style={{ background: topCol, boxShadow: `0 0 6px ${topCol}99` }} />
          <span className="fm-alarms-title" style={{ color: topCol }}>
            Active Alarms · {allAlarms.length}
          </span>
        </div>
        {allAlarms.length === 0 ? (
          <div style={{ padding: '12px 0 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.4 }}>✓</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--normal)', marginBottom: 2 }}>All Clear</div>
            <div style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>No active alarms on this shift</div>
          </div>
        ) : allAlarms.map(a => {
          const isActive = !!activeMachineId && (
            a.id === activeMachineId ||
            a.label.toLowerCase().replace('-', '_') === activeMachineId
          );
          return (
          <button key={a.id} className={`fm-alarm-btn${isActive ? ' fm-alarm-btn--active' : ''}`} onClick={() => onSelect?.(a.id)}>
            <div className="fm-alarm-bar" style={{ background: SEV_COL[a.severity] }} />
            <div style={{ flex: 1 }}>
              <div className="fm-alarm-label">{a.label}</div>
              <div className="fm-alarm-msg">{a.msg}</div>
            </div>
            <span className="fm-alarm-sev" style={{ color: SEV_COL[a.severity] }}>
              {a.severity}
            </span>
          </button>
          );
        })}
      </div>
      {LINE_DATA.map(line => <LineMetrics key={line.badge} line={line} />)}
    </div>
  );
}

// ── FloorMetrics ──────────────────────────────────────────────────────────────
interface FloorMetricsProps {
  onMachineClick?: (id: string) => void;
  offlineAlarms?: Alarm[];
  idle?: boolean;
  activeMachineId?: string | null;
}

export function FloorMetrics({ onMachineClick, offlineAlarms, idle, activeMachineId }: FloorMetricsProps) {
  return (
    <div className={`fm-sidebar${idle ? ' fm-sidebar--idle' : ''}`}>
      <div className="fm-scroll">
        <OEEOTIFWidget />
        <OpsCard onSelect={onMachineClick} offlineAlarms={offlineAlarms} activeMachineId={activeMachineId} />
      </div>
      <OpenClawTerminal />
    </div>
  );
}
