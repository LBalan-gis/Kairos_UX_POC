import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

import { EnvironmentDetails } from './FloorMapEnvironment';
import { FlowingVials, CausalArcTube, ConveyorBelt } from './FloorMapAnimations';
import { lookupPastStates } from './PredictionTimeline';
import {
  BlisterMachine,
  Cartoner,
  SerializationStation,
  InspectionMachine,
  Checkweigher,
  Labeler,
} from './FloorMapEquipment';
import type { EquipmentProps } from './FloorMapEquipment';
import { MapThemeManager } from './FloorMapMaterials';
import { FloorMetrics } from './FloorMetrics';
import { FloorSpatialWidgets } from './FloorSpatialWidgets';
import type { FloorMachine } from '../../types/floor';

import './FloorMapLayer.css';

// ── Component map ─────────────────────────────────────────────────────────────

const ComponentMap: Record<string, React.ComponentType<EquipmentProps>> = {
  BlisterMachine,
  Cartoner,
  SerializationStation,
  InspectionMachine,
  Checkweigher,
  Labeler,
};

// ── Scene layout constants ────────────────────────────────────────────────────

// ── Camera presets ────────────────────────────────────────────────────────────

type CamPreset = { pos: [number, number, number]; lookAt: [number, number, number] };
type CameraAction = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'rotate' | 'reset';

const CAM_PRESETS: Record<string, CamPreset> = {
  overview: { pos: [-1, 18, 24],  lookAt: [-1,  0.0, 2.25] },
  l1:       { pos: [-1,  9,  8],  lookAt: [-1,  0.5, 0.0]  },
  l2:       { pos: [-1,  9, 11],  lookAt: [-1,  0.5, 4.5]  },
};

interface OrbitControlsRigProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orbitRef: React.RefObject<any>;
  enabled: boolean;
  target: [number, number, number];
}

function OrbitControlsRig({ orbitRef, enabled, target }: OrbitControlsRigProps) {
  const { camera, gl, invalidate } = useThree();

  useEffect(() => {
    const controls = new OrbitControlsImpl(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 3;
    controls.maxDistance = 35;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.target.set(...target);
    controls.enabled = enabled;
    controls.addEventListener('change', invalidate);
    orbitRef.current = controls;
    return () => {
      controls.removeEventListener('change', invalidate);
      controls.dispose();
      orbitRef.current = null;
    };
  }, [camera, gl, invalidate, orbitRef, target]);

  useEffect(() => {
    const controls = orbitRef.current as OrbitControlsImpl | null;
    if (!controls) return;
    controls.enabled = enabled;
    controls.target.set(...target);
    controls.update();
  }, [enabled, orbitRef, target]);

  useFrame(() => {
    const controls = orbitRef.current as OrbitControlsImpl | null;
    controls?.update();
  });

  return null;
}

// ── FocusRig ──────────────────────────────────────────────────────────────────

interface FocusRigProps {
  target: FloorMachine;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orbitRef: React.RefObject<any>;
  onDone: () => void;
}

const FocusRig = ({ target, orbitRef, onDone }: FocusRigProps) => {
  const { camera } = useThree();
  const startPos = useRef<THREE.Vector3 | null>(null);
  const elapsed  = useRef(0);
  const DURATION = 0.58;

  const tPos    = useMemo(() => new THREE.Vector3(target.x, target.h + 5, target.z + 6), [target]);
  const tLookAt = useMemo(() => new THREE.Vector3(target.x, target.h * 0.5, target.z), [target]);

  useFrame((_, delta) => {
    if (!startPos.current) startPos.current = camera.position.clone();
    elapsed.current = Math.min(elapsed.current + delta, DURATION);
    const raw = elapsed.current / DURATION;
    // ease-out-back: overshoots slightly then settles — camera "lands" on target
    const c1 = 1.70158, c3 = c1 + 1;
    const t = 1 + c3 * Math.pow(raw - 1, 3) + c1 * Math.pow(raw - 1, 2);
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

// ── PresetRig ─────────────────────────────────────────────────────────────────

interface PresetRigProps {
  preset: CamPreset;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orbitRef: React.RefObject<any>;
  onDone: () => void;
}

const PresetRig = ({ preset, orbitRef, onDone }: PresetRigProps) => {
  const { camera } = useThree();
  const startPos = useRef<THREE.Vector3 | null>(null);
  const elapsed  = useRef(0);
  const DURATION = 0.62;

  const tPos    = useMemo(() => new THREE.Vector3(...preset.pos),    [preset]);
  const tLookAt = useMemo(() => new THREE.Vector3(...preset.lookAt), [preset]);

  useFrame((_, delta) => {
    if (!startPos.current) startPos.current = camera.position.clone();
    elapsed.current = Math.min(elapsed.current + delta, DURATION);
    const raw = elapsed.current / DURATION;
    // ease-out-expo: fast acceleration, graceful deceleration into position
    const t = raw >= 1 ? 1 : 1 - Math.pow(2, -10 * raw);
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

// ── Floor toolbar — unified strip ─────────────────────────────────────────────

const LEGEND_ITEMS = [
  { label: 'Normal',   dot: 'var(--normal)'   },
  { label: 'Warning',  dot: 'var(--warning)'  },
  { label: 'Critical', dot: 'var(--critical)' },
  { label: 'Offline',  dot: 'var(--offline)'  },
];

const CAM_ACTIONS: { action: CameraAction; label: string; title: string }[] = [
  { action: 'zoom-in',   label: '+',   title: 'Zoom in'   },
  { action: 'zoom-out',  label: '−',   title: 'Zoom out'  },
  { action: 'pan-left',  label: '←',   title: 'Pan left'  },
  { action: 'pan-right', label: '→',   title: 'Pan right' },
  { action: 'pan-up',    label: '↑',   title: 'Pan up'    },
  { action: 'pan-down',  label: '↓',   title: 'Pan down'  },
  { action: 'rotate',    label: '⟲',   title: 'Rotate'    },
  { action: 'reset',     label: 'Fit', title: 'Fit scene' },
];

const PRESET_BTNS = [
  { id: 'overview', label: 'All', title: 'Overview' },
  { id: 'l1',       label: 'L1',  title: 'Line 1'   },
  { id: 'l2',       label: 'L2',  title: 'Line 2'   },
];

function FloorToolbar({
  activePreset,
  onPreset,
  onAction,
}: {
  activePreset: string;
  onPreset: (id: string) => void;
  onAction: (action: CameraAction) => void;
}) {
  return (
    <>
      <div className="fl-toolbar-legend">
        {LEGEND_ITEMS.map(({ label, dot }) => (
          <div key={label} className="fl-toolbar-legend-item">
            <div className="fl-toolbar-dot" style={{ background: dot } as React.CSSProperties} />
            <span className="fl-toolbar-legend-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="fl-toolbar-controls">
        <div className="fl-toolbar-cluster">
          {CAM_ACTIONS.map(({ action, label, title }) => (
            <button key={action} type="button" title={title} onClick={() => onAction(action)} className="fl-cluster-btn">
              {label}
            </button>
          ))}
        </div>
        <div className="fl-toolbar-sep" />
        <div className="fl-toolbar-cluster">
          {PRESET_BTNS.map(({ id, label, title }) => (
            <button key={id} type="button" title={title} onClick={() => onPreset(id)} className={`fl-cluster-btn fl-cluster-btn--label${activePreset === id ? ' is-active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── WebGL loader ──────────────────────────────────────────────────────────────

const KairosLoader = ({ dark }: { dark: boolean }) => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6, ease: 'easeInOut' }}
    style={{
      position: 'absolute', inset: 0, zIndex: 9999,
      background: 'var(--bg-map)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <style>{`
      @keyframes kaiDot1 { 0%, 100% { opacity: 0.25; } 33% { opacity: 1; transform: scale(1.15); } }
      @keyframes kaiDot2 { 0%, 100% { opacity: 0.25; } 66% { opacity: 1; transform: scale(1.15); } }
      @keyframes kaiDot3 { 0%, 100% { opacity: 0.25; } 99% { opacity: 1; transform: scale(1.15); } }
    `}</style>
    <svg viewBox="0 0 100 100" width="72" height="72" style={{ overflow: 'visible' }}>
      <path d="M 74 26 A 34 34 0 1 0 74 74" stroke={dark ? '#30363D' : '#E2E8F0'} strokeWidth="5" fill="none" strokeLinecap="round" />
      <line x1="16" y1="50" x2="37" y2="50" stroke={dark ? '#30363D' : '#E2E8F0'} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="8" fill="#FF5000" stroke={dark ? '#10141C' : '#F8F9FA'} strokeWidth="3" style={{ filter: 'drop-shadow(0 0 10px rgba(255,80,0,0.6))' }} />
      <circle cx="63" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} style={{ animation: 'kaiDot1 1.2s infinite', transformOrigin: '63px 50px' }} />
      <circle cx="72" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} style={{ animation: 'kaiDot2 1.2s infinite', transformOrigin: '72px 50px' }} />
      <circle cx="81" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} style={{ animation: 'kaiDot3 1.2s infinite', transformOrigin: '81px 50px' }} />
    </svg>
    <div style={{ marginTop: 24, fontSize: 11, fontWeight: 700, color: dark ? '#30363D' : '#A0AEC0', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
      Initializing Workspace
    </div>
  </motion.div>
);

// ── Cinematic dive rig ────────────────────────────────────────────────────────

const DIVE_DURATION = 0.45;
const DIVE_FIRE_AT  = 0.60;

const TransitionRig = ({ targetX, onComplete }: { targetX: number; onComplete: () => void }) => {
  const { camera } = useThree();
  const startPos = useRef<THREE.Vector3 | null>(null);
  const elapsed  = useRef(0);
  const fired    = useRef(false);

  const targetPos = useMemo(() => new THREE.Vector3(targetX, 1.4, 3.8), [targetX]);
  const lookAt    = useMemo(() => new THREE.Vector3(targetX, 0.2, 0), [targetX]);

  useFrame((_, delta) => {
    if (!startPos.current) startPos.current = camera.position.clone();
    elapsed.current = Math.min(elapsed.current + delta, DIVE_DURATION);
    const raw = elapsed.current / DIVE_DURATION;
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

// ── IndicatorPill ─────────────────────────────────────────────────────────────

interface IndicatorPillProps {
  eq: FloorMachine;
  onClick: (id: string) => void;
  isDiving: boolean;
  hoveredId: string | null;
  focusedId?: string | null;
}

const IndicatorPill = ({ eq, onClick, isDiving, hoveredId, focusedId }: IndicatorPillProps) => {
  const eqPos = useMemo(() => new THREE.Vector3(eq.x, eq.h + 0.5, eq.z), [eq.x, eq.h, eq.z]);
  const divRef = useRef<HTMLDivElement | null>(null);
  const isFocused = focusedId === eq.id;

  useFrame(({ camera }) => {
    if (divRef.current) {
      if (isFocused) {
        divRef.current.style.opacity = '1';
        divRef.current.style.pointerEvents = 'auto';
        return;
      }
      if (isDiving) {
        divRef.current.style.opacity = '0';
        divRef.current.style.pointerEvents = 'none';
        return;
      }
      if (focusedId && !isFocused) {
        divRef.current.style.opacity = '0.18';
        divRef.current.style.pointerEvents = 'none';
        return;
      }
      const dist = camera.position.distanceTo(eqPos);
      const opacity = 1 - Math.max(0, Math.min(0.80, (dist - 18) / 16));
      divRef.current.style.opacity = String(opacity);
      divRef.current.style.pointerEvents = opacity < 0.15 ? 'none' : 'auto';
    }
  });

  const stateCls =
    eq.state === 'critical' ? 'pill pill-critical' :
    eq.state === 'warning'  ? 'pill pill-warning'  :
    eq.state === 'normal'   ? 'pill pill-normal'   :
    eq.state === 'pending'  ? 'pill pill-info'     :
                              'pill pill-base';

  const cls = [stateCls, 'floor-pill', isFocused ? 'floor-pill--focused' : ''].filter(Boolean).join(' ');

  return (
    <Html position={eqPos} center zIndexRange={[100, 0]}>
      <div ref={divRef} onClick={() => onClick(eq.id)} className={cls}>
        <span className="floor-pill__label">{eq.label}</span>
        <span className="floor-pill__status">
          {eq.state === 'offline' && '⏻ '}
          {eq.state === 'starved' && '⊘ '}
          {eq.state === 'pending' && '◌ '}
          {eq.stateLabel}
        </span>
        {(eq.metrics ?? []).map((m, i) => (
          <span key={i} className="floor-pill__metric">
            <span className="floor-pill__metric-tag">{m.tag}</span>
            <span className="floor-pill__metric-value">{m.value}</span>
          </span>
        ))}
        {isFocused && (
          <span className="floor-pill__action">→ Graph</span>
        )}
      </div>
    </Html>
  );
};

// ── Default dims ──────────────────────────────────────────────────────────────

const COMPONENT_DIMS: Record<string, { w: number; h: number; d: number }> = {
  BlisterMachine:       { w:2.8,  h:1.2,  d:1.4 },
  Cartoner:             { w:1.8,  h:1.8,  d:1.2 },
  SerializationStation: { w:1.2,  h:1.5,  d:1.0 },
  InspectionMachine:    { w:1.1,  h:1.8,  d:1.0 },
  Checkweigher:         { w:1.4,  h:0.85, d:1.2 },
  Labeler:              { w:1.0,  h:1.3,  d:1.0 },
};

// ── Offline/Starved overlay ───────────────────────────────────────────────────

function OfflineOverlay({ eq, starved = false }: { eq: FloorMachine; starved?: boolean }) {
  return (
    <group position={[eq.x, eq.h / 2, eq.z]}>
      <mesh renderOrder={999}>
        <boxGeometry args={[eq.w + 0.12, eq.h + 0.12, eq.d + 0.12]} />
        <meshStandardMaterial color="#1F2937" transparent opacity={starved ? 0.48 : 0.62} depthWrite={false} />
      </mesh>
      <Html center zIndexRange={[50, 0]}>
        <div className="fl-overlay-label fl-overlay-label--status">
          <span className={`fl-overlay-icon ${starved ? 'fl-overlay-icon--starved' : 'fl-overlay-icon--offline'}`}>
            {starved ? '⊘' : '⏻'}
          </span>
          <span className="fl-overlay-state">{starved ? 'STARVED' : 'OFFLINE'}</span>
        </div>
      </Html>
    </group>
  );
}

// ── Pending overlay ───────────────────────────────────────────────────────────

function PendingOverlay({ eq }: { eq: FloorMachine }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.18 + Math.sin(clock.elapsedTime * 2.2) * 0.10;
    }
  });
  return (
    <group position={[eq.x, eq.h / 2, eq.z]}>
      <mesh ref={meshRef} renderOrder={999}>
        <boxGeometry args={[eq.w + 0.14, eq.h + 0.14, eq.d + 0.14]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh renderOrder={998}>
        <boxGeometry args={[eq.w + 0.18, eq.h + 0.18, eq.d + 0.18]} />
        <meshStandardMaterial color="#58a6ff" transparent opacity={0.55} depthWrite={false} wireframe />
      </mesh>
      <Html center zIndexRange={[50, 0]}>
        <div className="fl-overlay-label fl-overlay-label--pending">
          <span className="fl-overlay-pending">PENDING IQ/OQ</span>
        </div>
      </Html>
    </group>
  );
}

// ── Environment lights ────────────────────────────────────────────────────────

function EnvironmentLights({ isSimulation, dark }: { isSimulation: boolean; dark: boolean }) {
  const mainLightRef        = useRef<THREE.DirectionalLight>(null!);
  const hemiLightRef        = useRef<THREE.HemisphereLight>(null!);
  const ambientLightRef     = useRef<THREE.AmbientLight>(null!);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);

  const targetMain = useMemo(() => new THREE.Color(), []);
  const targetHemi = new THREE.Color();
  const targetAmb  = new THREE.Color();
  const targetDir  = new THREE.Color();

  useFrame((_, delta) => {
    if (!mainLightRef.current || !hemiLightRef.current || !ambientLightRef.current || !directionalLightRef.current) return;
    targetMain.set(isSimulation ? '#D1D5DB' : '#FFFFFF');
    targetHemi.set(isSimulation ? (dark ? '#0F131A' : '#AEBECE') : (dark ? '#161A23' : '#CDD8E3'));
    targetAmb.set(isSimulation ? '#5B6F8A' : (dark ? '#859AB8' : '#8FA6BC'));
    targetDir.set(isSimulation ? '#88A0C4' : (dark ? '#C4D4ED' : '#E7EEF6'));
    mainLightRef.current.color.lerp(targetMain, delta * 3.5);
    hemiLightRef.current.color.lerp(targetHemi, delta * 3.5);
    ambientLightRef.current.color.lerp(targetAmb, delta * 3.5);
    directionalLightRef.current.color.lerp(targetDir, delta * 3.5);
  });

  return (
    <>
      <hemisphereLight ref={hemiLightRef} args={[0xA3B5D1, 0x161A23, dark ? 0.62 : 0.68]} />
      <ambientLight ref={ambientLightRef} color="#859AB8" intensity={dark ? 0.56 : 0.58} />
      <directionalLight
        ref={mainLightRef}
        color="#C4D4ED"
        intensity={dark ? 1.34 : 1.45}
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
      <directionalLight ref={directionalLightRef} color="#F8F9FA" intensity={dark ? 0.28 : 0.34} position={[8, 6, -4]} />
      <directionalLight color="#FFFFFF" intensity={dark ? 0.22 : 0.24} position={[0, 4, -10]} />
    </>
  );
}

// ── FloorMapLayer ─────────────────────────────────────────────────────────────

export function FloorMapLayer() {
  const {
    dark, setView, floorConfig,
    offlineIds, pendingMachines, relations, relationPropagation,
    simulatedTime, activeScenario, predictions,
  } = useAppStore(useShallow(s => ({
    dark:                s.dark,
    setView:             s.setView,
    floorConfig:         s.floorConfig,
    offlineIds:          s.offlineIds,
    pendingMachines:     s.pendingMachines,
    relations:           s.relations,
    relationPropagation: s.relationPropagation,
    simulatedTime:       s.simulatedTime,
    activeScenario:      s.activeScenario,
    predictions:         s.predictions,
  })));
  const sceneDark = dark;

  const allMachines = useMemo(
    () => floorConfig?.lines.flatMap(l => l.machines) ?? [],
    [floorConfig]
  );
  const entityToEq = useMemo(
    () => Object.fromEntries(
      allMachines.filter(e => e.entityId).map(e => [e.entityId!, e])
    ) as Record<string, FloorMachine>,
    [allMachines]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  const causalArcs = useMemo(() =>
    relations
      .filter(r => entityToEq[r.from] && entityToEq[r.to])
      .map(r => ({
        from:     entityToEq[r.from],
        to:       entityToEq[r.to],
        type:     r.type,
        delayMin: (relationPropagation[r.id] as { delayMin?: number } | undefined)?.delayMin ?? 0,
      }))
  , [relations, entityToEq, relationPropagation]);

  const liveEntityStates = useMemo(() =>
    Object.fromEntries(
      allMachines
        .filter(e => e.entityId)
        .map(e => [e.entityId!, e.state])
    ) as Record<string, string>
  , [allMachines]);

  const stateOverrides = useMemo<Record<string, string>>(() => {
    if (simulatedTime === null) return {};
    if (simulatedTime < 0) return lookupPastStates(simulatedTime);
    if (!predictions?.length) return {};
    const scenario = predictions.find(p => p.scenarioId === activeScenario);
    if (!scenario?.steps.length) return {};
    const step = scenario.steps.reduce((best, s) =>
      Math.abs(s.t - simulatedTime) < Math.abs(best.t - simulatedTime) ? s : best
    , scenario.steps[0]);
    return (step?.entityStates ?? {}) as Record<string, string>;
  }, [simulatedTime, activeScenario, predictions]);

  const currentEntityStates: Record<string, string> = simulatedTime === null ? liveEntityStates : stateOverrides;

  const starvedIds = useMemo(() => {
    const result = new Set<string>();
    (floorConfig?.lines ?? []).forEach(line => {
      line.order.forEach((id, idx) => {
        if (offlineIds.has(id)) {
          for (let i = idx + 1; i < line.order.length; i++) result.add(line.order[i]);
        }
      });
    });
    return result;
  }, [offlineIds, floorConfig]);

  const applyState = useCallback((eq: FloorMachine): FloorMachine => {
    if (offlineIds.has(eq.id)) return { ...eq, state: 'offline', stateLabel: 'OFFLINE' };
    if (starvedIds.has(eq.id)) return { ...eq, state: 'starved', stateLabel: 'STARVED' };
    if (!eq.entityId) return eq;
    const next = currentEntityStates[eq.entityId];
    if (!next || next === eq.state) return eq;
    return { ...eq, state: next, stateLabel: next.toUpperCase() };
  }, [currentEntityStates, offlineIds, starvedIds]);

  const pendingEquipment = useMemo((): FloorMachine[] => {
    const lineThemes = Object.fromEntries((floorConfig?.lines ?? []).map((line) => [line.label, line.lineTheme]));
    const lineDepths = Object.fromEntries((floorConfig?.lines ?? []).map((line) => [line.label, line.lz]));
    const l1 = pendingMachines.filter(m => m.line !== 'Line 2');
    const l2 = pendingMachines.filter(m => m.line === 'Line 2');
    return pendingMachines.map(m => {
      const compClass = (m.componentClass as string | undefined) || (m.type as string | undefined) || 'BlisterMachine';
      const dims      = COMPONENT_DIMS[compClass] ?? { w:1.4, h:1.2, d:1.2 };
      const lineTheme = lineThemes[m.line as string] ?? 'l1';
      const arr       = lineTheme === 'l2' ? l2 : l1;
      const idx       = arr.indexOf(m);
      return {
        id:             String(m.id ?? '').toLowerCase().replace(/-/g, '_') + '_pending',
        label:          String(m.id ?? ''),
        type:           compClass,
        componentClass: compClass,
        state:          'pending',
        stateLabel:     'PENDING',
        color:          'g1',
        lineTheme,
        x:              8.2 + idx * 2.4,
        z:              (lineDepths[m.line as string] as number | undefined) ?? 0.0,
        metrics:        [],
        ...dims,
      } as FloorMachine;
    });
  }, [floorConfig, pendingMachines]);

  const offlineAlarms = useMemo(() =>
    allMachines
      .filter(eq => applyState(eq).state === 'offline')
      .map(eq => ({ id: eq.id, label: eq.label, severity: 'offline', msg: `Offline · ${eq.type}` }))
  , [applyState, allMachines]);

  const offlineXRangesPerLine = useMemo(() =>
    (floorConfig?.lines ?? []).map(line =>
      line.machines
        .filter(eq => applyState(eq).state === 'offline')
        .map(eq => [eq.x - eq.w / 2 - 0.15, eq.x + eq.w / 2 + 0.15] as [number, number])
    )
  , [applyState, floorConfig]);

  const [isDiving, setIsDiving]           = useState(false);
  const [diveTargetX, setDiveTargetX]     = useState(0);
  const [hoveredId, setHoveredId]         = useState<string | null>(null);
  const [activePreset, setActivePreset]   = useState('overview');
  const [runningPreset, setRunningPreset] = useState<CamPreset | null>(null);
  const [focusedId, setFocusedId]         = useState<string | null>(null);
  const [focusTarget, setFocusTarget]     = useState<FloorMachine | null>(null);
  const [isFocusing, setIsFocusing]       = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);

  const handlePreset = useCallback((id: string) => {
    setActivePreset(id);
    setRunningPreset({ ...CAM_PRESETS[id] });
    setFocusedId(null);
  }, []);

  const handleCameraAction = useCallback((action: CameraAction) => {
    const controls = orbitRef.current as OrbitControlsImpl | null;
    if (!controls) return;

    const offset = new THREE.Vector3().subVectors(controls.object.position, controls.target);
    const panStep = 1.4;

    switch (action) {
      case 'zoom-in':
        offset.multiplyScalar(0.84);
        offset.setLength(THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance));
        controls.object.position.copy(controls.target).add(offset);
        break;
      case 'zoom-out':
        offset.multiplyScalar(1.18);
        offset.setLength(THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance));
        controls.object.position.copy(controls.target).add(offset);
        break;
      case 'pan-left':
        controls.target.x -= panStep;
        controls.object.position.x -= panStep;
        break;
      case 'pan-right':
        controls.target.x += panStep;
        controls.object.position.x += panStep;
        break;
      case 'pan-up':
        controls.target.z -= panStep;
        controls.object.position.z -= panStep;
        break;
      case 'pan-down':
        controls.target.z += panStep;
        controls.object.position.z += panStep;
        break;
      case 'rotate': {
        const rotated = offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 10);
        controls.object.position.copy(controls.target).add(rotated);
        break;
      }
      case 'reset':
        controls.target.set(...CAM_PRESETS.overview.lookAt);
        controls.object.position.set(...CAM_PRESETS.overview.pos);
        setActivePreset('overview');
        setFocusedId(null);
        break;
    }

    controls.update();
    controls.dispatchEvent({ type: 'change' });
  }, []);

  const handleMachineClick = useCallback((id: string) => {
    if (isDiving || isFocusing) return;
    const clicked = allMachines.find(e => e.id === id);
    if (!clicked) return;
    if (focusedId === id) {
      setFocusedId(null);
      setView('graph');
    } else {
      setFocusedId(id);
      setFocusTarget(clicked);
      setIsFocusing(true);
    }
  }, [isDiving, isFocusing, focusedId, allMachines, setView]);

  const handleDiveComplete = () => {
    setIsDiving(false);
    setView('graph');
  };

  if (!floorConfig) return null;

  return (
    <div ref={containerRef} className="fl-three-wrap fl-canvas-shell">
      <FloorMetrics onMachineClick={handleMachineClick} offlineAlarms={offlineAlarms} activeMachineId={focusedId} />

      <div className="fl-stage">
        <div className="fl-stage-toolbar">
          <FloorToolbar activePreset={activePreset} onPreset={handlePreset} onAction={handleCameraAction} />
        </div>

        <AnimatePresence>
          {!loaded && <KairosLoader dark={dark} />}
        </AnimatePresence>

        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.LinearToneMapping, toneMappingExposure: 1.0 }}
          camera={{ position: [-1, 18, 24], fov: 48, near: 0.1, far: 100 }}
          onCreated={() => setTimeout(() => setLoaded(true), 400)}
        >
          <MapThemeManager darkOverride={sceneDark} />
          <color attach="background" args={[sceneDark ? '#08111e' : '#f4f6f8']} />
          <fog attach="fog" args={[sceneDark ? '#08111e' : '#f4f6f8', 44, 80]} />
          <EnvironmentLights isSimulation={simulatedTime !== null} dark={sceneDark} />

          {runningPreset && (
            <PresetRig
              preset={runningPreset}
              orbitRef={orbitRef}
              onDone={() => setRunningPreset(null)}
            />
          )}

          {isFocusing && focusTarget && (
            <FocusRig
              target={focusTarget}
              orbitRef={orbitRef}
              onDone={() => setIsFocusing(false)}
            />
          )}

          {isDiving && (
            <TransitionRig targetX={diveTargetX} onComplete={handleDiveComplete} />
          )}

          <group position={[0, -0.6, 0]}>
            <EnvironmentDetails floorConfig={floorConfig} dark={sceneDark} />
            {floorConfig.lines.map((line, lineIdx) => (
              <FlowingVials key={line.id} lineTheme={line.lineTheme} zPos={line.lz} offlineXRanges={offlineXRangesPerLine[lineIdx] ?? []} />
            ))}

            {simulatedTime !== null && causalArcs
              .filter(arc => {
                const ss = currentEntityStates[arc.from.entityId!] ?? 'normal';
                const ts = currentEntityStates[arc.to.entityId!]   ?? 'normal';
                return ss !== 'normal' || ts !== 'normal';
              })
              .map((arc) => {
                const t  = simulatedTime ?? 0;
                const dp = t < 0 ? 1 : Math.min(1, Math.max(0, (t - arc.delayMin) / 5));
                return (
                  <CausalArcTube
                    key={arc.from.id + '-' + arc.to.id}
                    fromEq={arc.from}
                    toEq={arc.to}
                    sourceState={currentEntityStates[arc.from.entityId!] ?? 'normal'}
                    targetState={currentEntityStates[arc.to.entityId!]   ?? 'normal'}
                    drawProgress={dp}
                  />
                );
              })
            }

            {(() => {
              const hEq = hoveredId ? allMachines.find(e => e.id === hoveredId) : null;
              if (!hEq) return null;
              const col = hEq.state === 'critical' ? '#EF4444' : hEq.state === 'warning' ? '#F59E0B' : (hEq.state === 'offline' || hEq.state === 'starved') ? '#4B5563' : '#10B981';
              return <pointLight key="hover-glow" position={[hEq.x, hEq.h + 1.2, hEq.z]} color={col} intensity={2.5} distance={5} decay={2} />;
            })()}

            {(() => {
              if (!focusedId) return null;
              const fEq = allMachines.find(e => e.id === focusedId);
              if (!fEq) return null;
              const fEff = applyState(fEq);
              const col  = fEff.state === 'critical' ? '#EF4444' : fEff.state === 'warning' ? '#F59E0B' : (fEff.state === 'offline' || fEff.state === 'starved') ? '#6B7280' : '#10B981';
              return <pointLight key="focus-glow" position={[fEq.x, fEq.h + 3.0, fEq.z]} color={col} intensity={6.0} distance={9} decay={1.8} />;
            })()}

            {floorConfig.lines.map((line) => (
              <React.Fragment key={line.id}>
                {line.machines.map(eq => {
                  const eqEff = applyState(eq);
                  const Comp  = ComponentMap[eq.componentClass];
                  if (!Comp) return null;
                  return (
                    <React.Fragment key={eq.id}>
                      <group>
                        <Comp eq={eqEff} onClick={handleMachineClick} hoveredId={hoveredId} setHoveredId={setHoveredId} />
                        {(eqEff.state === 'offline' || eqEff.state === 'starved') && <OfflineOverlay eq={eqEff} starved={eqEff.state === 'starved'} />}
                      </group>
                      <IndicatorPill eq={eqEff} onClick={handleMachineClick} isDiving={isDiving} hoveredId={hoveredId} focusedId={focusedId} />
                    </React.Fragment>
                  );
                })}
                {line.machines.slice(0, -1).map((eq, i) => {
                  const next    = line.machines[i + 1];
                  const eqEff   = applyState(eq);
                  const midX    = (eq.x + next.x) / 2;
                  const length  = Math.abs(next.x - eq.x) - (eq.w / 2 + next.w / 2) - 0.05;
                  if (length <= 0) return null;
                  const isActive = eqEff.state !== 'offline' && eqEff.state !== 'starved';
                  return (
                    <ConveyorBelt key={`conv-${line.id}-${i}`} x={midX} z={eq.z} length={length} isActive={isActive} />
                  );
                })}
              </React.Fragment>
            ))}

            <FloorSpatialWidgets />

            {pendingEquipment.map(eq => {
              const Comp = ComponentMap[eq.componentClass];
              if (!Comp) return null;
              return (
                <React.Fragment key={eq.id}>
                  <group>
                    <Comp eq={eq} onClick={() => {}} hoveredId={null} setHoveredId={() => {}} />
                    <PendingOverlay eq={eq} />
                  </group>
                  <IndicatorPill eq={eq} onClick={() => {}} isDiving={isDiving} hoveredId={hoveredId} />
                </React.Fragment>
              );
            })}
          </group>

          <OrbitControlsRig orbitRef={orbitRef} enabled={!isDiving} target={[-1, 0, 2.25]} />
        </Canvas>

      </div>
    </div>
  );
}
