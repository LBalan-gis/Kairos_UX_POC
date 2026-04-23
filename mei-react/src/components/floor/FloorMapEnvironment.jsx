import React, { useMemo, useRef, useEffect } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAT, SKEU_MATS } from './FloorMapMaterials';
import { useAppStore } from '../../store/useAppStore';
import { lookupPastStates } from './PredictionTimeline';

// L1: secondary corridor at z=0,   BF arm goes to z=-2.5 (back of scene)
// L2: secondary corridor at z=4.5, BF arm goes to z=+7.0 (front of scene)
const LINES = [
  { lz: 0,   armZCenter: -1.25, armLen: 2.5, armZFar: -2.5 },
  { lz: 4.5, armZCenter:  5.75, armLen: 2.5, armZFar:  7.0 },
];

// ── Belt signal overlay helpers ───────────────────────────────────────────────
// Bright emissive tones matching STATE_ACCENTS in FloorMapMaterials

const SIGNAL_COL = {
  warning:  { color: '#FF8800', emissive: '#CC5500' },
  critical: { color: '#FF2828', emissive: '#CC0000' },
  failure:  { color: '#AA0000', emissive: '#880000' },
};

const STATE_RANK = { normal: 0, warning: 1, critical: 2, failure: 3 };
const RANK_STATE = ['normal', 'warning', 'critical', 'failure'];

function applyDamping(state, factor) {
  return RANK_STATE[Math.max(0, Math.round((STATE_RANK[state] ?? 0) * factor))] ?? 'normal';
}

// Returns the signal state traveling along a belt segment.
// fromEntity: entity id of the upstream machine driving this segment.
// dampingFactor: how much severity is absorbed in transit.
function beltSignal(fromEntity, dampingFactor, entityStates) {
  if (!fromEntity || !entityStates) return 'normal';
  const src = entityStates[fromEntity] ?? 'normal';
  return applyDamping(src, dampingFactor);
}

// Animated belt overlay — unlit (MeshBasicMaterial) so lighting never suppresses it.
// Sits as a glowing plane ON TOP of the belt, wide enough to read from any camera angle.
function BeltOverlay({ px, py, pz, sx, sz, signal }) {
  // Hooks must be called unconditionally — Rules of Hooks
  const matRef = useRef();
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.25;
  });

  if (signal === 'normal') return null;
  const col = SIGNAL_COL[signal]?.color ?? '#FF8800';

  return (
    <mesh position={[px, py, pz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[sx, sz]} />
      <meshBasicMaterial ref={matRef} color={col} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

function CorridorOverlay({ xCenter, xLen, lz, signal }) {
  // py=0.96 sits just above belt top face (box centre 0.88 + half-height 0.07 = 0.95)
  return <BeltOverlay px={xCenter} py={0.96} pz={lz} sx={xLen - 0.1} sz={0.64} signal={signal} />;
}

function ArmOverlay({ ax, ay, az, armLen, signal }) {
  // Arm runs along Z — plane width=arm belt width, height=arm length
  return <BeltOverlay px={ax} py={ay} pz={az} sx={0.64} sz={armLen - 0.1} signal={signal} />;
}

// ── Causal belt segment definitions ──────────────────────────────────────────
// Only segments that carry a defined causal relation are coloured.
// xCenter positions are midpoints between machine centers on the corridor.
//
//   BF arm (Z axis)  → r3: blister_machine → cartoner  (damping 0.9)
//   CTN→AGG corridor → r7: cartoner → serialization_queue (damping 0.6)

const CAUSAL_SEGS = [
  { xCenter: -5.75, xLen: 3.5, fromEntity: 'cartoner',        dampingFactor: 0.9 }, // CTN→AGG
];
const ARM_SEG = { fromEntity: 'blister_machine', dampingFactor: 0.9 };

// ── Fault beacon — state-reactive, pulses when active ────────────────────────

const BEACON_COL = {
  normal:   { col: '#22DD44', emissive: '#118822' },
  warning:  { col: '#FF8800', emissive: '#CC4400' },
  critical: { col: '#FF2828', emissive: '#CC0000' },
  failure:  { col: '#880000', emissive: '#440000' },
};

function FaultBeacon({ position, state = 'normal' }) {
  const matRef   = useRef();
  const lightRef = useRef();
  const isActive = state !== 'normal';
  const { col, emissive } = BEACON_COL[state] ?? BEACON_COL.warning;

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.color.set(col);
    matRef.current.emissive.set(emissive);
  }, [col, emissive]);

  useFrame(({ clock }) => {
    if (!matRef.current || !lightRef.current) return;
    const pulse = isActive
      ? 0.70 + Math.sin(clock.elapsedTime * 3.2) * 0.30
      : 0.15;
    matRef.current.emissiveIntensity = pulse;
    lightRef.current.intensity = isActive ? pulse * 0.55 : 0;
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.10, 0.12, 0.12, 10]} />
        <meshStandardMaterial color="#4A5A7B" metalness={0} roughness={1.0} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial ref={matRef} color={col} emissive={emissive}
          emissiveIntensity={1.0} roughness={1.0} metalness={0} transparent opacity={0.92} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.18, 0]} color={col}
        intensity={isActive ? 0.5 : 0} distance={7} decay={2} />
    </group>
  );
}

// Live entity states for L1 — drives belt overlays in live mode
const LIVE_ENTITY_STATES = {
  blister_machine:     'warning',
  cartoner:            'critical',
  serialization_queue: 'warning',
};

export const EnvironmentDetails = () => {
  const groupRef = useRef();
  const dark = useAppStore(s => s.dark);
  const simulatedTime  = useAppStore(s => s.simulatedTime);
  const activeScenario = useAppStore(s => s.activeScenario);
  const predictions    = useAppStore(s => s.predictions);

  const entityStates = useMemo(() => {
    if (simulatedTime === null) return LIVE_ENTITY_STATES;
    if (simulatedTime < 0)     return lookupPastStates(simulatedTime);
    const scenario = predictions?.find(p => p.scenarioId === activeScenario);
    if (!scenario?.steps.length) return LIVE_ENTITY_STATES;
    const step = scenario.steps.reduce((best, s) =>
      Math.abs(s.t - simulatedTime) < Math.abs(best.t - simulatedTime) ? s : best
    , scenario.steps[0]);
    return step?.entityStates ?? LIVE_ENTITY_STATES;
  }, [simulatedTime, activeScenario, predictions]);

  return (
  <group>
    {/* ── Floor zones ──────────────────────────────────────────── */}
    {/* Main base */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.0, -0.001, 2.25]}>
      <planeGeometry args={[18.5, 14.0]} />
      <meshStandardMaterial color={dark ? "#273143" : "#F8F9FA"} roughness={1.0} metalness={0} />
    </mesh>
    {/* Grade A clean room zones — around each BF arm */}
    {[{ cx: -7.75, cz: -1.5 }, { cx: -7.75, cz: 5.75 }].map((p, i) => (
      <mesh key={`cleanA-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p.cx, 0.003, p.cz]}>
        <planeGeometry args={[3.5, 4.5]} />
        <meshStandardMaterial color={dark ? "#33415C" : "#F1F3F4"} roughness={1.0} metalness={0} />
      </mesh>
    ))}
    {/* Secondary packaging corridor zones */}
    {LINES.map(({ lz }, i) => (
      <mesh key={`corr-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.002, lz]}>
        <planeGeometry args={[15.5, 2.2]} />
        <meshStandardMaterial color={dark ? "#3B4863" : "#E8EAED"} roughness={1.0} metalness={0} />
      </mesh>
    ))}
    {/* Central aisle between lines */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.002, 2.25]}>
      <planeGeometry args={[15.5, 2.1]} />
      <meshStandardMaterial color={dark ? "#2D3A54" : "#F1F3F4"} roughness={1.0} metalness={0} />
    </mesh>
    {/* Grade boundary markers — clean room edge and corridor end */}
    {[-6.0, 7.0].map((x, i) => (
      <mesh key={`bound-${i}`} position={[x, 0.008, 2.25]}>
        <boxGeometry args={[0.05, 0.015, 9.5]} />
        <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} roughness={1.0} metalness={0} />
      </mesh>
    ))}
    {/* Safety lines flanking each horizontal conveyor */}
    {LINES.map(({ lz }, i) =>
      [-1.0, 1.0].map((dz, j) => (
        <mesh key={`safe-${i}-${j}`} position={[-0.5, 0.01, lz + dz]}>
          <boxGeometry args={[15.5, 0.02, 0.06]} />
          <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} emissive={dark ? "#33415C" : "#BDC1C6"} emissiveIntensity={0.10} roughness={1.0} metalness={0} />
        </mesh>
      ))
    )}

    {/* ── HEPA filter units ────────────────────────────────────── */}
    {[{ x: -7.5, z: -2.5 }, { x: -1.5, z: 0 }, { x: -7.5, z: 7.0 }, { x: -1.5, z: 4.5 }].map((p, i) => (
      <mesh key={`hepa-${i}`} position={[p.x, 5.38, p.z]}>
        <boxGeometry args={[3.2, 0.16, 1.5]} />
        <meshStandardMaterial color={dark ? "#5A6D8F" : "#E8EAED"} metalness={0} roughness={1.0} />
      </mesh>
    ))}

    {/* ── Overhead process pipes + hangers ─────────────────────── */}
    {LINES.map(({ lz, armZCenter, armLen }, i) => (
      <group key={`ovhd-${i}`}>
        {/* Corridor pipe along X */}
        <mesh position={[-0.25, 3.05, lz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.052, 0.052, 15.5, 8]} />
          <meshStandardMaterial color={dark ? "#4A5A7B" : "#BDC1C6"} metalness={0} roughness={1.0} />
        </mesh>
        {/* Arm pipe along Z */}
        <mesh position={[-7.5, 3.05, armZCenter]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, armLen, 8]} />
          <meshStandardMaterial color={dark ? "#4A5A7B" : "#BDC1C6"} metalness={0} roughness={1.0} />
        </mesh>
      </group>
    ))}

    {/* ── Cable tray ───────────────────────────────────────────── */}
    <mesh position={[-0.25, 3.28, -4.2]}>
      <boxGeometry args={[15.5, 0.07, 0.30]} />
      <meshStandardMaterial color={dark ? "#4A5A7B" : "#BDC1C6"} metalness={0} roughness={1.0} />
    </mesh>

    {/* ── L-shaped conveyor lines ──────────────────────────────── */}
    {LINES.map(({ lz, armZCenter, armLen }, i) => (
      <group key={`conv-${i}`}>
        {/* Horizontal belt */}
        <mesh position={[-0.25, 0.88, lz]}>
          <boxGeometry args={[15.5, 0.14, 0.65]} />
          <primitive object={MAT.conveyor} attach="material" />
        </mesh>
        {/* Horizontal rails */}
        {[-0.36, 0.36].map((dz, j) => (
          <mesh key={j} position={[-0.25, 0.97, lz + dz]}>
            <boxGeometry args={[15.5, 0.10, 0.07]} />
            <primitive object={MAT.rail} attach="material" />
          </mesh>
        ))}
        {/* Rollers along horizontal */}
        <Instances limit={23}>
          <boxGeometry args={[0.06, 0.16, 0.67]} />
          <primitive object={MAT.roller} attach="material" />
          {Array.from({ length: 22 }).map((_, k) => (
            <Instance key={k} position={[-7.4 + k * 0.72, 0.88, lz]} />
          ))}
        </Instances>
        {/* Corner piece */}
        <mesh position={[-7.5, 0.88, lz]}>
          <boxGeometry args={[0.68, 0.14, 0.68]} />
          <primitive object={MAT.conveyor} attach="material" />
        </mesh>
        {/* Arm belt along Z */}
        <mesh position={[-7.5, 0.88, armZCenter]}>
          <boxGeometry args={[0.65, 0.14, armLen]} />
          <primitive object={MAT.conveyor} attach="material" />
        </mesh>
        {/* Arm rails flanking along X */}
        {[-0.36, 0.36].map((dx, j) => (
          <mesh key={j} position={[-7.5 + dx, 0.97, armZCenter]}>
            <boxGeometry args={[0.07, 0.10, armLen]} />
            <primitive object={MAT.rail} attach="material" />
          </mesh>
        ))}
      </group>
    ))}

    {/* ── Compressed air rail ──────────────────────────────────── */}
    <mesh position={[7.0, 1.2, 2.25]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.06, 0.06, 4.8, 8]} />
      <meshStandardMaterial color={dark ? "#3B4863" : "#A8D8EA"} emissive={dark ? "#1D2A3A" : "#75C5E6"} emissiveIntensity={0.15} metalness={0} roughness={1.0} />
    </mesh>
    {LINES.map(({ lz }, i) => (
      <mesh key={`feed-${i}`} position={[7.0, 0.8, lz]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
        <meshStandardMaterial color={dark ? "#3B4863" : "#A8D8EA"} emissive={dark ? "#1D2A3A" : "#75C5E6"} emissiveIntensity={0.15} metalness={0} roughness={1.0} />
      </mesh>
    ))}

    {/* ── RABS enclosures around BF arms ───────────────────────── */}
    {[{ cx: -7.5, cz: -2.5 }, { cx: -7.5, cz: 7.0 }].map(({ cx, cz }, i) => (
      <group key={`rabs-${i}`}>
        {[[-1.55, -0.82], [-1.55, 0.82], [1.55, -0.82], [1.55, 0.82]].map(([dx, dz], j) => (
          <mesh key={j} position={[cx + dx, 1.4, cz + dz]}>
            <boxGeometry args={[0.07, 2.8, 0.07]} />
            <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} metalness={0} roughness={1.0} />
          </mesh>
        ))}
        {/* Top bars along X */}
        {[-0.82, 0.82].map((dz, j) => (
          <mesh key={`tx-${j}`} position={[cx, 2.8, cz + dz]}>
            <boxGeometry args={[3.1, 0.065, 0.065]} />
            <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} metalness={0} roughness={1.0} />
          </mesh>
        ))}
        {/* Top bars along Z */}
        {[-1.55, 1.55].map((dx, j) => (
          <mesh key={`tz-${j}`} position={[cx + dx, 2.8, cz]}>
            <boxGeometry args={[0.065, 0.065, 1.64]} />
            <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} metalness={0} roughness={1.0} />
          </mesh>
        ))}
      </group>
    ))}

    {/* ── Belt signal overlays — BFS propagation visualised ────── */}
    {LINES.map(({ lz, armZCenter, armLen }, i) => {
      // L2 (i===1) machines are all normal in live mode — don't bleed L1 faults onto L2 belts
      const lineStates = (i === 1) ? {} : entityStates;
      const armSig  = beltSignal(ARM_SEG.fromEntity, ARM_SEG.dampingFactor, lineStates);
      return (
        <group key={`bso-${i}`}>
          <ArmOverlay ax={-7.5} ay={0.96} az={armZCenter} armLen={armLen} signal={armSig} />
          {CAUSAL_SEGS.map((seg, j) => (
            <CorridorOverlay
              key={j}
              xCenter={seg.xCenter}
              xLen={seg.xLen}
              lz={lz}
              signal={beltSignal(seg.fromEntity, seg.dampingFactor, lineStates)}
            />
          ))}
        </group>
      );
    })}

    {/* ── Fault beacons — BF arms, state-reactive ──────────────── */}
    <FaultBeacon position={[-7.5, 1.62, -2.5]} state={entityStates.blister_machine ?? 'normal'} />
    <FaultBeacon position={[-7.5, 1.62,  7.0]} state='normal' />

    {/* ── Sensors on BF-1101 ──────────────────────────────────── */}
    <mesh position={[-7.5, 1.55, -1.68]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.11, 0.11, 0.10, 10]} />
      <meshStandardMaterial color="#FF3333" emissive="#EF4444" emissiveIntensity={0.8} metalness={0} roughness={1.0} />
    </mesh>
    <mesh position={[-7.5, 1.00, -1.68]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.11, 0.11, 0.10, 10]} />
      <meshStandardMaterial color="#FFB800" emissive="#F59E0B" emissiveIntensity={0.7} metalness={0} roughness={1.0} />
    </mesh>
    <mesh position={[-7.5, 1.275, -1.80]}>
      <cylinderGeometry args={[0.018, 0.018, 0.59, 6]} />
      <meshStandardMaterial color={dark ? "#4A5A7B" : "#BDC1C6"} metalness={0} roughness={1.0} />
    </mesh>
  </group>
  );
};
