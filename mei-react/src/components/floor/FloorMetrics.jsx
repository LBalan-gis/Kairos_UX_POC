import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { OpenClawTerminal } from './OpenClawTerminal';

// ── Live ticker hook ──────────────────────────────────────────────────────────
function useLiveTicker(base, amplitude = 0.6, intervalMs = 1800) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      const delta = (Math.random() - 0.5) * 2 * amplitude;
      setVal(+(base + delta).toFixed(1));
    }, intervalMs + Math.random() * 400);
    return () => clearInterval(id);
  }, [base, amplitude, intervalMs]);
  return val;
}

// ── Severity colours ──────────────────────────────────────────────────────────
const SEV_COL = { critical: '#EF4444', warning: '#F59E0B', offline: '#6B7280' };
const ACTIVE_ALARMS = [
  { id: 'ctn_1101', label: 'CTN-1101', severity: 'critical', msg: 'Starved · queue backing up' },
  { id: 'bf_1101',  label: 'BF-1101',  severity: 'warning',  msg: 'Film tension 34 N → 42 N' },
];

const LINE_DATA = [
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

// ── LineMetrics ───────────────────────────────────────────────────────────────
function LineMetrics({ line }) {
  const dark = useAppStore(s => s.dark);
  const liveOee  = useLiveTicker(line.oee, 0.5, 2200);
  const liveBpm  = useLiveTicker(line.throughput, 1.2, 1600);
  const progress = Math.round((line.packed / line.target) * 100);
  const t = dark ? {
    div: 'rgba(255,255,255,0.12)', name: 'rgba(255,255,255,0.90)', oee: '#fff',
    pct: 'rgba(255,255,255,0.60)', lbl: 'rgba(255,255,255,0.60)', track: 'rgba(255,255,255,0.15)',
    batch: 'rgba(255,255,255,0.50)', bpm: 'rgba(255,255,255,0.80)',
  } : {
    div: 'rgba(0,0,0,0.10)', name: '#111827', oee: '#111827',
    pct: 'rgba(0,0,0,0.70)', lbl: 'rgba(0,0,0,0.70)', track: 'rgba(0,0,0,0.15)',
    batch: 'rgba(0,0,0,0.60)', bpm: 'rgba(0,0,0,0.90)',
  };
  return (
    <div style={{ borderTop: `1px solid ${t.div}`, padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <div style={{ background: dark ? line.badgeBg : line.badgeBgSolid, borderRadius: 5, padding: '1px 7px', fontSize: '8px', fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>{line.badge}</div>
        <span style={{ fontSize: '9px', fontWeight: 700, color: t.name }}>{line.lineName}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '16px', fontWeight: 800, color: t.oee, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>{liveOee}</span>
        <span style={{ fontSize: '9px', color: t.pct, marginLeft: 1 }}>%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: '8px', color: t.lbl, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Target</span>
        <span style={{ fontSize: '8px', fontWeight: 700, color: line.accent }}>{line.packed.toLocaleString()} / {line.target.toLocaleString()}</span>
      </div>
      <div style={{ height: 3, background: t.track, borderRadius: 2, marginBottom: 5 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: line.accent, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: '7.5px', color: t.batch, letterSpacing: '0.03em', marginBottom: line.correction ? 6 : 0, fontVariantNumeric: 'tabular-nums' }}>
        {line.batchId} · <span style={{ color: t.bpm }}>{liveBpm}</span> bpm
      </div>
      {line.correction && (
        <div style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 7, padding: '6px 9px' }}>
          <div style={{ fontSize: '8px', fontWeight: 800, color: '#10B981', letterSpacing: '0.04em', marginBottom: 2 }}>{line.correction.action}</div>
          <div style={{ fontSize: '7.5px', color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{line.correction.detail}</div>
        </div>
      )}
    </div>
  );
}

// ── OpsCard ───────────────────────────────────────────────────────────────────
function OpsCard({ onSelect, offlineAlarms = [] }) {
  const dark = useAppStore(s => s.dark);
  const allAlarms  = [...ACTIVE_ALARMS, ...offlineAlarms];
  const topCol = SEV_COL[allAlarms[0]?.severity] ?? SEV_COL.warning;

  const divider  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const lblColor = dark ? '#fff' : '#111827';
  const msgColor = dark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.70)';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ padding: '10px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: topCol, boxShadow: `0 0 6px ${topCol}99`, flexShrink: 0 }} />
          <span style={{ fontSize: '8px', fontWeight: 800, color: topCol, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Active Alarms · {allAlarms.length}
          </span>
        </div>
        {allAlarms.map((a, i) => (
          <button key={a.id} onClick={() => onSelect?.(a.id)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            width: '100%', background: 'transparent', border: 'none',
            borderTop: i > 0 ? `1px solid ${divider}` : 'none',
            padding: '5px 0', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 3, minHeight: 26, borderRadius: 2, background: SEV_COL[a.severity], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: lblColor, marginBottom: 1 }}>{a.label}</div>
              <div style={{ fontSize: '8px', color: msgColor, lineHeight: 1.4 }}>{a.msg}</div>
            </div>
            <span style={{ fontSize: '7px', fontWeight: 700, color: SEV_COL[a.severity], letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 1, flexShrink: 0 }}>
              {a.severity}
            </span>
          </button>
        ))}
      </div>
      {LINE_DATA.map(line => <LineMetrics key={line.badge} line={line} />)}
    </div>
  );
}

// ── OEE / OTIF live KPI widget ────────────────────────────────────────────────
const KPI_LINES = [
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

function SubBar({ label, val, dark }) {
  const col = val >= 95 ? '#10B981' : val >= 90 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 7, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.60)', letterSpacing: '0.10em' }}>{label}</span>
        <span style={{ fontSize: 7, color: dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.80)' }}>{val}%</span>
      </div>
      <div style={{ height: 2, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ width: `${val}%`, height: '100%', background: col, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function OEEOTIFWidget() {
  const dark = useAppStore(s => s.dark);
  const l1Oee = useLiveTicker(78.4, 0.3, 2400);
  const l2Oee = useLiveTicker(93.4, 0.2, 3200);
  const live = [l1Oee, l2Oee];
  return (
    <div style={{ width: '100%', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 0, fontFamily: 'inherit' }}>
      <div style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}` }}>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.5)' }}>KPI · LIVE</span>
        <span style={{ fontSize: 8, color: dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.35)', letterSpacing: '0.05em' }}>OEE · OTIF</span>
      </div>
      {KPI_LINES.map((l, i) => (
        <div key={l.badge} style={{ padding: '8px 10px', borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ background: dark ? l.badgeBg : l.badgeBgSolid, borderRadius: 4, padding: '1px 6px', fontSize: 7, fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>{l.badge}</div>
            <span style={{ fontSize: 20, fontWeight: 700, color: l.oeeCol, letterSpacing: '-0.02em', lineHeight: 1 }}>{live[i].toFixed(1)}%</span>
            <span style={{ fontSize: 8, color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.4)' }}>OEE</span>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <SubBar label="A" val={l.avail} dark={dark} />
            <SubBar label="P" val={l.perf} dark={dark} />
            <SubBar label="Q" val={l.qual} dark={dark} />
          </div>
        </div>
      ))}
      <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.06)', borderTop: '1px solid rgba(239,68,68,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
          <span style={{ fontSize: 9, color: '#EF4444', flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EF4444', marginBottom: 2 }}>OTIF RISK · Line 1</div>
            <div style={{ fontSize: 9, color: dark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.60)', lineHeight: 1.4 }}>
              Physics engine predicts miss of Friday 17:00 SAP target if uncorrected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FloorMetrics — the sidebar DOM overlay ────────────────────────────────────
export function FloorMetrics({ dark, onMachineClick, offlineAlarms }) {
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0,
      zIndex: 120, display: 'flex', flexDirection: 'column',
      width: 300, pointerEvents: 'auto',
      background: dark ? 'linear-gradient(170deg,rgba(18,24,40,0.97) 0%,rgba(12,16,28,0.97) 100%)' : 'linear-gradient(170deg,rgba(250,251,252,0.98) 0%,rgba(235,238,242,0.98) 100%)',
      backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
      borderRight: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(100,60,160,0.12)',
      boxShadow: dark ? '0 1px 0 rgba(255,255,255,0.10) inset,0 0 0 1px rgba(122,92,173,0.12),0 28px 72px rgba(0,0,0,0.60)' : '0 0 0 1px rgba(100,60,160,0.10),0 28px 72px rgba(0,0,0,0.16)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 32, flex: 1, overflowY: 'auto' }}>
        <OEEOTIFWidget />
        <OpsCard onSelect={onMachineClick} offlineAlarms={offlineAlarms} />
      </div>
      <OpenClawTerminal />
    </div>
  );
}
