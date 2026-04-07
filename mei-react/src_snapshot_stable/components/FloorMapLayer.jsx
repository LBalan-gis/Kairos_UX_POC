import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';

// Custom Sub-components
import { EnvironmentDetails } from './floor/FloorMapEnvironment';
import { FlowingVials, CausalArcTube } from './floor/FloorMapAnimations';
import { lookupPastStates } from './floor/PredictionTimeline';
import {
  BlisterMachine,
  Cartoner,
  SerializationStation,
  InspectionMachine,
  Checkweigher,
  Labeler
} from './floor/FloorMapEquipment';
import { MapThemeManager } from './floor/FloorMapMaterials';

import './FloorMapLayer.css';

// Component Map to dynamically render equipment
const ComponentMap = {
  BlisterMachine,
  Cartoner,
  SerializationStation,
  InspectionMachine,
  Checkweigher,
  Labeler
};

// ── Camera presets ────────────────────────────────────────────────────────────

const CAM_PRESETS = {
  overview: { pos: [-1, 16, 20],  lookAt: [-1,  0.0, 2.25] },
  l1:       { pos: [-1,  9,  8],  lookAt: [-1,  0.5, 0.0]  },
  l2:       { pos: [-1,  9, 11],  lookAt: [-1,  0.5, 4.5]  },
};

const PresetRig = ({ preset, orbitRef, onDone }) => {
  const { camera } = useThree();
  const startPos = useRef(null);
  const elapsed  = useRef(0);
  const DURATION = 0.55;

  const tPos    = useMemo(() => new THREE.Vector3(...preset.pos),   [preset]);
  const tLookAt = useMemo(() => new THREE.Vector3(...preset.lookAt),[preset]);

  useFrame((_, delta) => {
    if (!startPos.current) startPos.current = camera.position.clone();
    elapsed.current = Math.min(elapsed.current + delta, DURATION);
    const raw = elapsed.current / DURATION;
    const t = raw < 0.5 ? 4*raw*raw*raw : 1 - Math.pow(-2*raw+2, 3) / 2;
    camera.position.lerpVectors(startPos.current, tPos, t);
    camera.lookAt(tLookAt);
    if (raw >= 1) {
      if (orbitRef.current) {
        orbitRef.current.target.copy(tLookAt);
        orbitRef.current.update();
      }
      onDone();
    }
  });
  return null;
};

// ── Toolbar ───────────────────────────────────────────────────────────────────

const PANEL_BG     = 'rgba(22,30,42,0.72)';
const PANEL_BORDER = 'rgba(255,255,255,0.12)';
const TEXT_DIM     = 'rgba(255,255,255,0.40)';

// Camera SVG icon
const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2.5L5 4H2.5A1.5 1.5 0 001 5.5v7A1.5 1.5 0 002.5 14h11a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0013.5 4H11L10 2.5H6z"
      stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
    <circle cx="8" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
  </svg>
);

function CameraControl({ activePreset, onPreset }) {
  const [open, setOpen] = useState(false);
  const btns = [
    { id: 'overview', label: 'Overview' },
    { id: 'l1',       label: 'Line 1'   },
    { id: 'l2',       label: 'Line 2'   },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      zIndex: 11, pointerEvents: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
    }}>
      {/* Preset list — shown when open */}
      {open && (
        <div style={{
          background: PANEL_BG,
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 10,
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 6px 24px rgba(0,0,0,0.40)',
          padding: '4px',
          display: 'flex', flexDirection: 'column', gap: 2,
          userSelect: 'none',
        }}>
          {btns.map(({ id, label }) => {
            const active = activePreset === id;
            return (
              <button key={id} onClick={() => { onPreset(id); setOpen(false); }} style={{
                background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                border: active ? '1px solid rgba(255,255,255,0.20)' : '1px solid transparent',
                borderRadius: 7, padding: '5px 14px',
                cursor: 'pointer',
                color: active ? '#fff' : TEXT_DIM,
                fontSize: '9px', fontWeight: active ? 700 : 500,
                letterSpacing: '0.06em', textAlign: 'left',
                transition: 'all 0.10s', whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Camera icon button */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: 36, height: 36,
        background: open ? 'rgba(255,255,255,0.18)' : PANEL_BG,
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: `1px solid ${open ? 'rgba(255,255,255,0.28)' : PANEL_BORDER}`,
        borderRadius: 10,
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 4px 16px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        color: open ? '#fff' : 'rgba(255,255,255,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}>
        <CameraIcon />
      </button>
    </div>
  );
}

// ── Side metric panels ────────────────────────────────────────────────────────

const SEV_COL = { critical: '#EF4444', warning: '#F59E0B' };
const ACTIVE_ALARMS = [
  { id: 'ctn_1101', label: 'CTN-1101', severity: 'critical', msg: 'Starved · queue backing up' },
  { id: 'bf_1101',  label: 'BF-1101',  severity: 'warning',  msg: 'Film tension 34 N → 42 N' },
];

const LINE_DATA = [
  {
    accent: '#F59E0B', badge: 'L1', badgeBg: 'rgba(245,158,11,0.25)', lineName: 'Line 1',
    oee: 78.4, throughput: 218, batchId: 'PH-2026-018 · SKU 41829',
    packed: 1120, target: 2960,
    correction: { action: 'Adjust FT-1101 → 42 N', detail: '94% confidence · recovers in 12 min · saves £29K' },
  },
  {
    accent: '#10B981', badge: 'L2', badgeBg: 'rgba(16,185,129,0.22)', lineName: 'Line 2',
    oee: 93.4, throughput: 224, batchId: 'PH-2026-019 · SKU 41830',
    packed: 2210, target: 2960,
    correction: null,
  },
];

function OpsCard({ onSelect }) {
  const topSev = ACTIVE_ALARMS[0].severity;
  const topCol = SEV_COL[topSev];

  return (
    <div style={{
      background: PANEL_BG,
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.12)',
      borderLeft: `3px solid ${topCol}`,
      boxShadow: '0 1px 0 0 rgba(255,255,255,0.14) inset, 0 6px 24px rgba(0,0,0,0.35)',
      width: 210,
      overflow: 'hidden',
    }}>

      {/* ── Alarms section ── */}
      <div style={{ padding: '10px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: topCol, boxShadow: `0 0 6px ${topCol}99`, flexShrink: 0 }} />
          <span style={{ fontSize: '8px', fontWeight: 800, color: topCol, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Active Alarms · {ACTIVE_ALARMS.length}
          </span>
        </div>
        {ACTIVE_ALARMS.map((a, i) => (
          <button key={a.id} onClick={() => onSelect?.(a.id)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            width: '100%', background: 'transparent', border: 'none',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            padding: '5px 0', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 3, minHeight: 26, borderRadius: 2, background: SEV_COL[a.severity], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#fff', marginBottom: 1 }}>{a.label}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{a.msg}</div>
            </div>
            <span style={{ fontSize: '7px', fontWeight: 700, color: SEV_COL[a.severity], letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 1, flexShrink: 0 }}>
              {a.severity}
            </span>
          </button>
        ))}
      </div>

      {/* ── Line panels ── */}
      {LINE_DATA.map((line, idx) => {
        const progress = Math.round((line.packed / line.target) * 100);
        return (
          <div key={line.badge} style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 12px',
          }}>
            {/* Line header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ background: line.badgeBg, borderRadius: 5, padding: '1px 7px', fontSize: '8px', fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>
                {line.badge}
              </div>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>{line.lineName}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{line.oee}</span>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', marginLeft: 1 }}>%</span>
            </div>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Target</span>
              <span style={{ fontSize: '8px', fontWeight: 700, color: line.accent }}>{line.packed.toLocaleString()} / {line.target.toLocaleString()}</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.10)', borderRadius: 2, marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: line.accent, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.03em', marginBottom: line.correction ? 6 : 0 }}>
              {line.batchId} · {line.throughput} bpm
            </div>
            {line.correction && (
              <div style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 7, padding: '6px 9px' }}>
                <div style={{ fontSize: '8px', fontWeight: 800, color: '#10B981', letterSpacing: '0.04em', marginBottom: 2 }}>{line.correction.action}</div>
                <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.38)' }}>{line.correction.detail}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Cinematic dive rig — timed ease-in-out, fires view switch mid-flight ──────
const DIVE_DURATION = 0.45; // seconds
const DIVE_FIRE_AT  = 0.60; // fraction at which to call onSwitch

const TransitionRig = ({ targetX, onComplete }) => {
  const { camera } = useThree();
  const startPos = useRef(null);
  const elapsed  = useRef(0);
  const fired    = useRef(false);

  const targetPos = useMemo(() => new THREE.Vector3(targetX, 1.4, 3.8), [targetX]);
  const lookAt    = useMemo(() => new THREE.Vector3(targetX, 0.2, 0), [targetX]);

  useFrame((_, delta) => {
    if (!startPos.current) startPos.current = camera.position.clone();

    elapsed.current = Math.min(elapsed.current + delta, DIVE_DURATION);
    const raw = elapsed.current / DIVE_DURATION;

    // Ease-in-out cubic
    const t = raw < 0.5
      ? 4 * raw * raw * raw
      : 1 - Math.pow(-2 * raw + 2, 3) / 2;

    camera.position.lerpVectors(startPos.current, targetPos, t);
    camera.lookAt(lookAt);

    if (raw >= DIVE_FIRE_AT && !fired.current) {
      fired.current = true;
      onComplete();
    }
  });
  return null;
};

const IndicatorPill = ({ eq, onClick, isDiving, hoveredId }) => {
  const eqPos = useMemo(() => new THREE.Vector3(eq.x, eq.h + 0.5, eq.z), [eq.x, eq.h, eq.z]);
  const divRef = useRef();
  const isHovered = hoveredId === eq.id;
  const isOther = hoveredId && hoveredId !== eq.id;

  useFrame(({ camera }) => {
    if (divRef.current) {
      if (isDiving || isHovered || isOther) {
        divRef.current.style.opacity = 0;
        divRef.current.style.pointerEvents = 'none';
        return;
      }
      const dist = camera.position.distanceTo(eqPos);
      let opacity = 1 - Math.max(0, Math.min(0.80, (dist - 18) / 16));
      divRef.current.style.opacity = opacity;
      divRef.current.style.pointerEvents = opacity < 0.15 ? 'none' : 'auto';
    }
  });

  const bgColor = eq.state === 'critical' ? '#EF4444' : eq.state === 'warning' ? '#F59E0B' : '#1A2636';

  return (
    <Html position={eqPos} center zIndexRange={[100, 0]}>
      <div
        ref={divRef}
        onClick={() => onClick(eq.id)}
        onPointerOver={(e) => { e.currentTarget.style.transform = 'translate3d(0, -18px, 0) scale(1.05)'; }}
        onPointerOut={(e) => { e.currentTarget.style.transform = 'translate3d(0, -15px, 0) scale(1)'; }}
        style={{
          cursor: 'pointer',
          transform: 'translate3d(0, -15px, 0)',
          transition: 'opacity 0.1s linear, transform 0.18s ease',
          background: bgColor,
          opacity: 1,
          borderRadius: '20px',
          padding: '4px 11px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
          whiteSpace: 'nowrap',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>
          {eq.label}
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {eq.stateLabel}
        </span>
      </div>
    </Html>
  );
};

// Definition data arrays
const EQUIPMENT_L1 = [
  { id: 'bf_1101',  label: 'BF-1101',  type: 'Blister Former',         stateLabel: 'WARNING',  state: 'warning',  componentClass: 'BlisterMachine',       x: -7.5, z: -2.5, w: 2.8, h: 1.2, d: 1.4, entityId: 'blister_machine',
    metrics: [{ tag: 'FT-1101', label: 'Film Tension',  value: '34 N',     s: 'warn' }, { tag: 'ST-1101', label: 'Blister Speed', value: '218 bpm', s: 'warn' }, { tag: 'KPI-OEE', label: 'OEE', value: '78.4 %', s: 'warn' }] },
  { id: 'ctn_1101', label: 'CTN-1101', type: 'Cartoner',                stateLabel: 'CRITICAL', state: 'critical', componentClass: 'Cartoner',             x: -7.5, z:  0.0, w: 1.8, h: 1.8, d: 1.2, entityId: 'cartoner',
    metrics: [{ tag: 'ST-1101', label: 'Pack Rate',     value: '142 cpm',  s: 'crit' }, { tag: 'QE-1101', label: 'Reject Count',  value: '14',      s: 'crit' }, { tag: 'KPI-OEE', label: 'OEE', value: '61.2 %', s: 'crit' }] },
  { id: 'agg_1101', label: 'AGG-1101', type: 'Aggregation Station',     stateLabel: 'WARNING',  state: 'warning',  componentClass: 'SerializationStation', x: -4.0, z:  0.0, w: 1.2, h: 1.5, d: 1.0, entityId: 'serialization_queue',
    metrics: [{ tag: 'AR-1101', label: 'Scan Rate',     value: '99.1 %',   s: 'warn' }, { tag: 'QE-1101', label: 'Rejects',       value: '3',       s: 'warn' }, { tag: 'KPI-OEE', label: 'OEE', value: '82.7 %', s: 'warn' }] },
  { id: 'vis_1101', label: 'VIS-1101', type: 'Vision Inspection System', stateLabel: 'NORMAL',   state: 'normal',   componentClass: 'InspectionMachine',    x: -0.5, z:  0.0, w: 1.1, h: 1.8, d: 1.0,
    metrics: [{ tag: 'AE-1101', label: 'Throughput',    value: '312 u/min',s: 'ok'   }, { tag: 'QE-1101', label: 'Reject Rate',   value: '0.3 %',   s: 'ok'   }, { tag: 'KPI-OEE', label: 'OEE', value: '94.1 %', s: 'ok'   }] },
  { id: 'cw_1101',  label: 'CW-1101',  type: 'Checkweigher',            stateLabel: 'NORMAL',   state: 'normal',   componentClass: 'Checkweigher',         x:  2.8, z:  0.0, w: 1.4, h: 0.85, d: 1.2,
    metrics: [{ tag: 'WT-1101', label: 'Mean Weight',   value: '482 mg',   s: 'ok'   }, { tag: 'WT-1102', label: 'Std Dev',       value: '1.2 mg',  s: 'ok'   }, { tag: 'KPI-OEE', label: 'OEE', value: '96.8 %', s: 'ok'   }] },
  { id: 'lab_1101', label: 'LAB-1101', type: 'Labeler',                 stateLabel: 'NORMAL',   state: 'normal',   componentClass: 'Labeler',              x:  5.8, z:  0.0, w: 1.0, h: 1.3, d: 1.0,
    metrics: [{ tag: 'ST-1102', label: 'Label Rate',    value: '298 /min', s: 'ok'   }, { tag: 'QE-1102', label: 'Rejects',       value: '0',       s: 'ok'   }, { tag: 'KPI-OEE', label: 'OEE', value: '97.2 %', s: 'ok'   }] },
];

const EQUIPMENT_L2 = [
  { id: 'bf_1201',  label: 'BF-1201',  type: 'Blister Former',         stateLabel: 'NORMAL', state: 'normal', componentClass: 'BlisterMachine',       x: -7.5, z:  7.0, w: 2.8, h: 1.2, d: 1.4,
    metrics: [{ tag: 'FT-1201', label: 'Film Tension',  value: '36 N',     s: 'ok' }, { tag: 'ST-1201', label: 'Blister Speed', value: '224 bpm', s: 'ok' }, { tag: 'KPI-OEE', label: 'OEE', value: '91.2 %', s: 'ok' }] },
  { id: 'ctn_1201', label: 'CTN-1201', type: 'Cartoner',                stateLabel: 'NORMAL', state: 'normal', componentClass: 'Cartoner',             x: -7.5, z:  4.5, w: 1.8, h: 1.8, d: 1.2,
    metrics: [{ tag: 'ST-1201', label: 'Pack Rate',     value: '158 cpm',  s: 'ok' }, { tag: 'QE-1201', label: 'Rejects',       value: '2',       s: 'ok' }, { tag: 'KPI-OEE', label: 'OEE', value: '93.4 %', s: 'ok' }] },
  { id: 'agg_1201', label: 'AGG-1201', type: 'Aggregation Station',     stateLabel: 'NORMAL', state: 'normal', componentClass: 'SerializationStation', x: -4.0, z:  4.5, w: 1.2, h: 1.5, d: 1.0,
    metrics: [{ tag: 'AR-1201', label: 'Scan Rate',     value: '99.8 %',   s: 'ok' }, { tag: 'QE-1201', label: 'Rejects',       value: '0',       s: 'ok' }, { tag: 'KPI-OEE', label: 'OEE', value: '95.3 %', s: 'ok' }] },
  { id: 'vis_1201', label: 'VIS-1201', type: 'Vision Inspection System', stateLabel: 'NORMAL', state: 'normal', componentClass: 'InspectionMachine',    x: -0.5, z:  4.5, w: 1.1, h: 1.8, d: 1.0,
    metrics: [{ tag: 'AE-1201', label: 'Throughput',    value: '318 u/min',s: 'ok' }, { tag: 'QE-1201', label: 'Reject Rate',   value: '0.2 %',   s: 'ok' }, { tag: 'KPI-OEE', label: 'OEE', value: '95.8 %', s: 'ok' }] },
  { id: 'cw_1201',  label: 'CW-1201',  type: 'Checkweigher',            stateLabel: 'NORMAL', state: 'normal', componentClass: 'Checkweigher',         x:  2.8, z:  4.5, w: 1.4, h: 0.85, d: 1.2,
    metrics: [{ tag: 'WT-1201', label: 'Mean Weight',   value: '481 mg',   s: 'ok' }, { tag: 'WT-1202', label: 'Std Dev',       value: '1.1 mg',  s: 'ok' }, { tag: 'KPI-OEE', label: 'OEE', value: '97.5 %', s: 'ok' }] },
  { id: 'lab_1201', label: 'LAB-1201', type: 'Labeler',                 stateLabel: 'NORMAL', state: 'normal', componentClass: 'Labeler',              x:  5.8, z:  4.5, w: 1.0, h: 1.3, d: 1.0,
    metrics: [{ tag: 'ST-1202', label: 'Label Rate',    value: '302 /min', s: 'ok' }, { tag: 'QE-1202', label: 'Rejects',       value: '0',       s: 'ok' }, { tag: 'KPI-OEE', label: 'OEE', value: '98.1 %', s: 'ok' }] },
];

// Entity-id → equipment lookup — must be after both arrays are defined
const ENTITY_TO_EQ = Object.fromEntries(
  [...EQUIPMENT_L1, ...EQUIPMENT_L2]
    .filter(e => e.entityId)
    .map(e => [e.entityId, e])
);

// ── Environment Lighting (Dark / Light mapping) ───────────────────────────────

function EnvironmentLights({ isSimulation, dark }) {
  const mainLightRef = useRef();
  const hemiLightRef = useRef();
  const ambientLightRef = useRef(); // Added ref for ambient light
  const directionalLightRef = useRef(); // Added ref for the main directional light

  const targetMain = useMemo(() => new THREE.Color(), []);
  const targetHemi = new THREE.Color();
  const targetAmb = new THREE.Color();
  const targetDir = new THREE.Color();

  useFrame((_, delta) => {
    if (!mainLightRef.current || !hemiLightRef.current || !ambientLightRef.current || !directionalLightRef.current) return;

    targetMain.set(isSimulation ? '#D1D5DB' : '#FFFFFF');
    targetHemi.set(isSimulation ? (dark ? '#0F131A' : '#D1D5DB') : (dark ? '#161A23' : '#F8F9FA'));
    targetAmb.set(isSimulation ? '#5B6F8A' : (dark ? '#859AB8' : '#FFFFFF'));
    targetDir.set(isSimulation ? '#88A0C4' : (dark ? '#C4D4ED' : '#FFFFFF'));
    
    mainLightRef.current.color.lerp(targetMain, delta * 3.5);
    hemiLightRef.current.color.lerp(targetHemi, delta * 3.5);
    ambientLightRef.current.color.lerp(targetAmb, delta * 3.5);
    directionalLightRef.current.color.lerp(targetDir, delta * 3.5);
  });

  return (
    <>
      <hemisphereLight ref={hemiLightRef} args={[0xA3B5D1, 0x161A23, 1.3]} />
      <ambientLight color="#859AB8" intensity={1.5} />
      <directionalLight
        ref={mainLightRef}
        color="#C4D4ED"
        intensity={0.6}
        position={[-4, 12, 4]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />
      <directionalLight color="#F8F9FA" intensity={0.2} position={[8, 6, -4]} />
      <directionalLight color="#FFFFFF" intensity={0.15} position={[0, 4, -10]} />
    </>
  );
}

export function FloorMapLayer() {
  const dark             = useAppStore(s => s.dark);
  const setView          = useAppStore(s => s.setView);
  const containerRef     = useRef();

  // Prevent wheel events from triggering browser zoom (same fix as GraphBoard).
  // OrbitControls still receives them via the canvas; we just stop the browser default.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);
  const relations            = useAppStore(s => s.relations);
  const relationPropagation  = useAppStore(s => s.relationPropagation);
  const simulatedTime        = useAppStore(s => s.simulatedTime);
  const activeScenario       = useAppStore(s => s.activeScenario);
  const predictions          = useAppStore(s => s.predictions);

  // Derive causal arcs from store relations — only links where both endpoints
  // map to floor equipment (via entityId). Carry delayMin for arc grow animation.
  const causalArcs = useMemo(() =>
    relations
      .filter(r => ENTITY_TO_EQ[r.from] && ENTITY_TO_EQ[r.to])
      .map(r => ({
        from:     ENTITY_TO_EQ[r.from],
        to:       ENTITY_TO_EQ[r.to],
        type:     r.type,
        delayMin: relationPropagation[r.id]?.delayMin ?? 0,
      }))
  , [relations]);

  // Live entity states — derived from static equipment definitions (no predictions)
  const liveEntityStates = useMemo(() =>
    Object.fromEntries(
      [...EQUIPMENT_L1, ...EQUIPMENT_L2]
        .filter(e => e.entityId)
        .map(e => [e.entityId, e.state])
    )
  , []);

  // Simulated overrides when scrubbing (past: synthetic history, future: engine)
  const stateOverrides = useMemo(() => {
    if (simulatedTime === null) return {};
    if (simulatedTime < 0) return lookupPastStates(simulatedTime);
    if (!predictions?.length) return {};
    const scenario = predictions.find(p => p.scenarioId === activeScenario);
    if (!scenario?.steps.length) return {};
    const step = scenario.steps.reduce((best, s) =>
      Math.abs(s.t - simulatedTime) < Math.abs(best.t - simulatedTime) ? s : best
    , scenario.steps[0]);
    return step?.entityStates ?? {};
  }, [simulatedTime, activeScenario, predictions]);

  // Single source of truth for entity states — live or simulated
  const currentEntityStates = simulatedTime === null ? liveEntityStates : stateOverrides;

  // Apply current entity state to an equipment object for rendering
  const applyState = useCallback((eq) => {
    if (!eq.entityId) return eq;
    const next = currentEntityStates[eq.entityId];
    if (!next || next === eq.state) return eq;
    return { ...eq, state: next, stateLabel: next.toUpperCase() };
  }, [currentEntityStates]);

  const [isDiving, setIsDiving]         = useState(false);
  const [diveTargetX, setDiveTargetX]   = useState(0);
  const [hoveredId, setHoveredId]       = useState(null);
  const [activePreset, setActivePreset] = useState('overview');
  const [runningPreset, setRunningPreset] = useState(null);
  const orbitRef = useRef();

  const handlePreset = useCallback((id) => {
    setActivePreset(id);
    setRunningPreset({ ...CAM_PRESETS[id] });
  }, []);

  const handleMachineClick = (id) => {
    if (isDiving) return;
    const clicked = EQUIPMENT_L1.find(e => e.id === id) || EQUIPMENT_L2.find(e => e.id === id);
    if (clicked) {
      setDiveTargetX(clicked.x);
      setIsDiving(true);
    }
  };

  const handleDiveComplete = () => {
    setIsDiving(false);
    setView('graph');
  };


  return (
    <div ref={containerRef} className="fl-three-wrap" style={{ width: '100%', height: '100%', background: '#E4DFD8', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', right: 12, top: 56,
        zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: 'calc(100% - 24px)', maxHeight: 'calc(100% - 80px)', overflowY: 'auto',
      }}>
        <OpsCard onSelect={handleMachineClick} />
      </div>
      <CameraControl activePreset={activePreset} onPreset={handlePreset} />

      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
        camera={{ position: [-1, 16, 20], fov: 48, near: 0.1, far: 100 }}
      >
        <MapThemeManager />
        <color attach="background" args={[dark ? '#161A23' : '#E4DFD8']} />
        <fog attach="fog" args={[dark ? '#161A23' : '#E4DFD8', 24, 48]} />
        <EnvironmentLights isSimulation={simulatedTime !== null} dark={dark} />

        {/* Camera preset rig */}
        {runningPreset && (
          <PresetRig
            preset={runningPreset}
            orbitRef={orbitRef}
            onDone={() => setRunningPreset(null)}
          />
        )}

        {/* Cinematic dive transition rig */}
        {isDiving && (
          <TransitionRig isDiving={isDiving} targetX={diveTargetX} onComplete={handleDiveComplete} />
        )}

        <group position={[0, -0.6, 0]}>
          <EnvironmentDetails />
          <FlowingVials isL2={false} />
          <FlowingVials isL2={true} />

          {/* Arcs only appear during scrub — they replay the causal chain through time */}
          {simulatedTime !== null && causalArcs
            .filter(arc => {
              const ss = currentEntityStates[arc.from.entityId] ?? 'normal';
              const ts = currentEntityStates[arc.to.entityId]   ?? 'normal';
              return ss !== 'normal' || ts !== 'normal';
            })
            .map((arc, i) => {
              // drawProgress: past=fully drawn, future grows from 0 at delayMin to 1 at +5min
              const t  = simulatedTime ?? 0;
              const dp = t < 0 ? 1 : Math.min(1, Math.max(0, (t - arc.delayMin) / 5));
              return (
                <CausalArcTube
                  key={arc.from.id + '-' + arc.to.id}
                  fromEq={arc.from}
                  toEq={arc.to}
                  sourceState={currentEntityStates[arc.from.entityId] ?? 'normal'}
                  targetState={currentEntityStates[arc.to.entityId]   ?? 'normal'}
                  drawProgress={dp}
                />
              );
            })
          }

          {/* Hover glow — point light tracks the hovered machine */}
          {(() => {
            const hEq = hoveredId ? [...EQUIPMENT_L1, ...EQUIPMENT_L2].find(e => e.id === hoveredId) : null;
            if (!hEq) return null;
            const col = hEq.state === 'critical' ? '#EF4444' : hEq.state === 'warning' ? '#F59E0B' : '#10B981';
            return <pointLight key="hover-glow" position={[hEq.x, hEq.h + 1.2, hEq.z]} color={col} intensity={2.5} distance={5} decay={2} />;
          })()}

          {/* Render Line 1 */}
          {EQUIPMENT_L1.map(eq => {
            const eqEff = applyState(eq);
            const Comp  = ComponentMap[eq.componentClass];
            if (!Comp) return null;
            return (
              <React.Fragment key={eq.id}>
                <group>
                  <Comp eq={eqEff} isL2={false} onClick={handleMachineClick} hoveredId={hoveredId} setHoveredId={setHoveredId} />
                </group>
                <IndicatorPill eq={eq} onClick={handleMachineClick} isDiving={isDiving} hoveredId={hoveredId} />
              </React.Fragment>
            );
          })}

          {/* Render Line 2 */}
          {EQUIPMENT_L2.map(eq => {
            const eqEff = applyState(eq);
            const Comp  = ComponentMap[eq.componentClass];
            if (!Comp) return null;
            return (
              <React.Fragment key={eq.id}>
                <group>
                  <Comp eq={eqEff} isL2={true} onClick={handleMachineClick} hoveredId={hoveredId} setHoveredId={setHoveredId} />
                </group>
                <IndicatorPill eq={eq} isL2={true} onClick={handleMachineClick} isDiving={isDiving} hoveredId={hoveredId} />
              </React.Fragment>
            );
          })}
        </group>

        <OrbitControls
          ref={orbitRef}
          makeDefault={!isDiving}
          enableDamping
          dampingFactor={0.12}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={3}
          maxDistance={35}
          enablePan={true}
          panSpeed={0.8}
          target={[-1, 0, 2.25]}
        />
        
      </Canvas>
    </div>
  );
}
