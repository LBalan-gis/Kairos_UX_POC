import React, { useState, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LINE_THEME_MATS, MAT, RUN_LED_BY_THEME, SKEU_MATS, STATUS_LED_BY_THEME, getColorMats } from './FloorMapMaterials';
import type { ColorKey } from './FloorMapMaterials';
import type { FloorMachine } from '../../types/floor';

// ── Types ─────────────────────────────────────────────────────────────────────

// Internal type adds topY — a render-only cap height override, not stored in config
type InternalMachine = FloorMachine & { topY?: number };

export interface EquipmentProps {
  eq: FloorMachine;
  onClick?: (id: string) => void;
  hoveredId?: string | null;
  setHoveredId?: (id: string | null) => void;
}

interface BaseEquipmentProps {
  eq: InternalMachine;
  onClick?: (id: string) => void;
  hoveredId?: string | null;
  setHoveredId?: (id: string | null) => void;
  children: React.ReactNode;
}

interface SimpleBoxProps {
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: React.ReactNode;
}

function SimpleBox({ args, position, rotation, castShadow, receiveShadow, children }: SimpleBoxProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow}>
      <boxGeometry args={args} />
      {children}
    </mesh>
  );
}

// ── Control panel ─────────────────────────────────────────────────────────────

const ControlPanel = ({ eq }: { eq: FloorMachine }) => {
  const panelZ = eq.d / 2 + 0.05;
  const panelW = eq.w * 0.58;
  const panelH = eq.h * 0.44;
  const themeKey = eq.lineTheme ?? 'l1';
  const themeMats = LINE_THEME_MATS[themeKey] ?? LINE_THEME_MATS.l1;
  const statusLeds = STATUS_LED_BY_THEME[themeKey] ?? STATUS_LED_BY_THEME.l1;
  const runLed = RUN_LED_BY_THEME[themeKey] ?? RUN_LED_BY_THEME.l1;

  return (
    <group position={[0, 0, panelZ]}>
      <SimpleBox args={[panelW, panelH, 0.055]}>
        <primitive object={themeMats.panel} attach="material" />
      </SimpleBox>
      <mesh position={[0, panelH * 0.10, 0.035]}>
        <boxGeometry args={[panelW * 0.65, panelH * 0.40, 0.02]} />
        <primitive object={themeMats.screen} attach="material" />
      </mesh>
      <mesh position={[-panelW * 0.25, -panelH * 0.28, 0.038]}>
        <sphereGeometry args={[0.034, 8, 8]} />
        <primitive object={statusLeds[eq.state as keyof typeof statusLeds] ?? statusLeds.normal} attach="material" />
      </mesh>
      <mesh position={[panelW * 0.25, -panelH * 0.28, 0.038]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <primitive object={runLed} attach="material" />
      </mesh>
    </group>
  );
};

// ── Animated cap (state-color top) ────────────────────────────────────────────

const TARGET_COLORS: Record<string, { c: string; e: string; i: number }> = {
  normal:   { c: '#10B981', e: '#047857', i: 0.75 },
  warning:  { c: '#F59E0B', e: '#B45309', i: 0.80 },
  critical: { c: '#EF4444', e: '#B91C1C', i: 0.85 },
  offline:  { c: '#374151', e: '#1F2937', i: 0.0 },
  starved:  { c: '#374151', e: '#1F2937', i: 0.0 },
  pending:  { c: '#1d4ed8', e: '#1e40af', i: 0.3 },
};

function AnimatedCap({ state, w, capY, d, isCw }: { state: string; w: number; capY: number; d: number; isCw: boolean }) {
  const target = TARGET_COLORS[state] ?? TARGET_COLORS.normal;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.35 }), []);
  const tc = useMemo(() => new THREE.Color(), []);
  const te = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    tc.set(target.c);
    te.set(target.e);
    mat.color.lerp(tc, delta * 5);
    mat.emissive.lerp(te, delta * 5);
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target.i, delta * 5);
  });

  return (
    <mesh position={[0, capY, 0]}>
      <boxGeometry args={[isCw ? w * 1.32 : w, 0.18, d + 0.03]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

// ── Animated orb (warning/critical beacon) ────────────────────────────────────

const TARGET_ORB: Record<string, { s: number; c: string; e: string; l: number }> = {
  normal:   { s: 0, c: '#000000', e: '#000000', l: 0 },
  warning:  { s: 1, c: '#FFB800', e: '#CC8800', l: 2.0 },
  critical: { s: 1, c: '#FF3333', e: '#CC0000', l: 3.0 },
  offline:  { s: 0, c: '#000000', e: '#000000', l: 0 },
  starved:  { s: 0, c: '#000000', e: '#000000', l: 0 },
  pending:  { s: 0, c: '#000000', e: '#000000', l: 0 },
};

function AnimatedOrb({ state, h }: { state: string; h: number }) {
  const target = TARGET_ORB[state] ?? TARGET_ORB.normal;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0 }), []);
  const tc = useMemo(() => new THREE.Color(), []);
  const te = useMemo(() => new THREE.Color(), []);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    tc.set(target.c);
    te.set(target.e);
    mat.color.lerp(tc, delta * 6);
    mat.emissive.lerp(te, delta * 6);
    mat.emissiveIntensity = 3.0;

    if (groupRef.current) {
      const ts = target.s;
      groupRef.current.scale.lerp(new THREE.Vector3(ts, ts, ts), delta * 8);
    }
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, target.l, delta * 8);
      lightRef.current.color.lerp(tc, delta * 6);
    }
  });

  return (
    <group position={[0, h / 2 + 0.28, 0]}>
      <group ref={groupRef} scale={[0, 0, 0]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.22, 6]} />
          <meshStandardMaterial color="#8898AC" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.12, 14, 10]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <pointLight ref={lightRef} distance={5} decay={2} intensity={0} />
      </group>
    </group>
  );
}

// ── OntoCard (hover tooltip) ──────────────────────────────────────────────────

const OntoCard = ({ eq }: { eq: FloorMachine }) => (
  <div className="onto-card">
    <div className="onto-card__header">
      <div>
        <div className="onto-card__name">{eq.label}</div>
        {eq.type && <div className="onto-card__type">{eq.type}</div>}
      </div>
      <div className="onto-card__divider" />
      <span className={`onto-card__badge onto-card__badge--${eq.state ?? 'normal'}`}>
        {eq.stateLabel}
      </span>
    </div>
    <div className="onto-card__metrics">
      {(eq.metrics ?? []).map((m, i) => (
        <div key={i} className="onto-card__metric">
          <span className="onto-card__metric-tag">{m.tag}</span>
          <span className="onto-card__metric-label">{m.label}</span>
          <span className={`onto-card__metric-value onto-card__metric-value--${m.s}`}>{m.value}</span>
        </div>
      ))}
    </div>
    <div className="onto-card__stem" />
  </div>
);

// ── BaseEquipment ─────────────────────────────────────────────────────────────

const BaseEquipment = ({ eq, children, onClick, hoveredId, setHoveredId }: BaseEquipmentProps) => {
  const [hovered, setHovered] = useState(false);
  const pw   = eq.id.includes('cw_') ? eq.w * 1.38 : eq.w + 0.18;
  const pd   = eq.d + 0.18;
  const capY = (eq.topY !== undefined ? eq.topY : eq.h / 2) + 0.07 - eq.h / 2;
  const isOther = hoveredId && hoveredId !== eq.id;

  return (
    <group
      position={[eq.x, eq.h / 2, eq.z]}
      onClick={(e) => { e.stopPropagation(); onClick?.(eq.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setHoveredId?.(eq.id); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); setHoveredId?.(null); document.body.style.cursor = 'default'; }}
      castShadow receiveShadow
    >
      {children}
      {/* Plinth */}
      <SimpleBox args={[pw, 0.06, pd]} position={[0, -eq.h / 2 + 0.03, 0]} receiveShadow>
        <primitive object={SKEU_MATS.chassis} attach="material" />
      </SimpleBox>
      <AnimatedCap state={eq.state} w={eq.w} d={eq.d} capY={capY} isCw={eq.id.includes('cw_')} />
      <AnimatedOrb state={eq.state} h={eq.h} />
      <ControlPanel eq={eq} />

    </group>
  );
};

// ── Machine components ────────────────────────────────────────────────────────

export const BlisterMachine = ({ eq, onClick, hoveredId, setHoveredId }: EquipmentProps) => {
  const bm = getColorMats((eq.color || 'g1') as ColorKey);
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.40 }} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <SimpleBox args={[eq.w, eq.h * 0.35, eq.d * 0.9]} position={[0, -eq.h * 0.30, 0]} castShadow receiveShadow>
        <primitive object={bm.chassis} attach="material" />
      </SimpleBox>
      <SimpleBox args={[eq.w, eq.h * 0.35, eq.d]} position={[0, 0.05, 0]} castShadow receiveShadow>
        <primitive object={bm.housing} attach="material" />
      </SimpleBox>
      <mesh position={[0, eq.h * 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, eq.w * 0.60, 12]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
    </BaseEquipment>
  );
};

export const Cartoner = ({ eq, onClick, hoveredId, setHoveredId }: EquipmentProps) => {
  const bm = getColorMats((eq.color || 'g1') as ColorKey);
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.41 }} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <SimpleBox args={[eq.w, eq.h * 0.40, eq.d]} position={[0, -eq.h * 0.28, 0]} castShadow receiveShadow>
        <primitive object={bm.chassis} attach="material" />
      </SimpleBox>
      <SimpleBox args={[eq.w * 0.30, eq.h * 0.70, eq.d * 0.40]} position={[-eq.w * 0.38, eq.h * 0.10, 0]} castShadow receiveShadow>
        <primitive object={bm.housing} attach="material" />
      </SimpleBox>
      <SimpleBox args={[eq.w * 0.98, eq.h * 0.20, eq.d * 0.98]} position={[0, -eq.h * 0.02, 0]} castShadow receiveShadow>
        <primitive object={bm.housing} attach="material" />
      </SimpleBox>
    </BaseEquipment>
  );
};

export const SerializationStation = ({ eq, onClick, hoveredId, setHoveredId }: EquipmentProps) => {
  const bm = getColorMats((eq.color || 'g1') as ColorKey);
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.40 }} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <SimpleBox args={[eq.w, eq.h * 0.45, eq.d]} position={[0, -eq.h * 0.25, 0]} castShadow receiveShadow>
        <primitive object={bm.chassis} attach="material" />
      </SimpleBox>
      <SimpleBox args={[eq.w * 0.95, eq.h * 0.15, eq.d * 0.95]} position={[0, 0.05, 0]} castShadow receiveShadow>
        <primitive object={bm.housing} attach="material" />
      </SimpleBox>
      {[-eq.w * 0.38, eq.w * 0.38].map((x, i) => (
        <mesh key={i} position={[x, eq.h * 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, eq.h * 0.55, 0.06]} />
          <primitive object={MAT.pipe} attach="material" />
        </mesh>
      ))}
    </BaseEquipment>
  );
};

export const InspectionMachine = ({ eq, onClick, hoveredId, setHoveredId }: EquipmentProps) => {
  const bm = getColorMats((eq.color || 'g1') as ColorKey);
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.55 }} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <SimpleBox args={[eq.w, eq.h * 0.45, eq.d]} position={[0, -eq.h * 0.25, 0]} castShadow receiveShadow>
        <primitive object={bm.chassis} attach="material" />
      </SimpleBox>
      <mesh position={[0, eq.h * 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, eq.h * 0.55, 12]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
      <mesh position={[0, eq.h * 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.40, 0.20, 0.40]} />
        <primitive object={bm.housing} attach="material" />
      </mesh>
    </BaseEquipment>
  );
};

export const Checkweigher = ({ eq, onClick, hoveredId, setHoveredId }: EquipmentProps) => {
  const bm = getColorMats((eq.color || 'g1') as ColorKey);
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.25 }} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <SimpleBox args={[eq.w * 1.28, eq.h * 0.30, eq.d * 1.18]} position={[0, -eq.h * 0.33, 0]} castShadow receiveShadow>
        <primitive object={bm.chassis} attach="material" />
      </SimpleBox>
      <mesh position={[0, -eq.h * 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[eq.w * 1.20, 0.04, eq.d * 0.6]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
      {[-eq.w * 0.48, eq.w * 0.48].map((x, i) => (
        <mesh key={i} position={[x, eq.h * 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, eq.h * 0.58, 0.06]} />
          <primitive object={bm.chassis} attach="material" />
        </mesh>
      ))}
    </BaseEquipment>
  );
};

export const Labeler = ({ eq, onClick, hoveredId, setHoveredId }: EquipmentProps) => {
  const bm = getColorMats((eq.color || 'g1') as ColorKey);
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.33 }} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <SimpleBox args={[eq.w, eq.h * 0.45, eq.d]} position={[0, -eq.h * 0.25, 0]} castShadow receiveShadow>
        <primitive object={bm.chassis} attach="material" />
      </SimpleBox>
      <SimpleBox args={[eq.w * 0.98, eq.h * 0.20, eq.d * 0.98]} position={[0, 0.10, 0]} castShadow receiveShadow>
        <primitive object={bm.housing} attach="material" />
      </SimpleBox>
      <mesh position={[eq.w * 0.55, eq.h * 0.10, 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 12]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
    </BaseEquipment>
  );
};
