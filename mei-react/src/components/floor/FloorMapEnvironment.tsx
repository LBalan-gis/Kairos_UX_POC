import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { MAT } from './FloorMapMaterials';
import { useAppStore } from '../../store/useAppStore';
import { lookupPastStates } from '../../domain/simulation/history';
import { resolveSimulationEntityStates, selectSimulationContext } from '../../domain/simulation/selectors';
import type { FloorConfig } from '../../types/floor';

// ── Belt signal helpers ───────────────────────────────────────────────────────

const SIGNAL_COL: Record<string, { color: string; emissive: string }> = {
  warning:  { color: '#FF8800', emissive: '#CC5500' },
  critical: { color: '#FF2828', emissive: '#CC0000' },
  failure:  { color: '#AA0000', emissive: '#880000' },
};

const STATE_RANK: Record<string, number> = { normal: 0, warning: 1, critical: 2, failure: 3 };
const RANK_STATE = ['normal', 'warning', 'critical', 'failure'];

function applyDamping(state: string, factor: number): string {
  return RANK_STATE[Math.max(0, Math.round((STATE_RANK[state] ?? 0) * factor))] ?? 'normal';
}

function beltSignal(
  fromEntity: string | null | undefined,
  dampingFactor: number,
  entityStates: Record<string, string>,
): string {
  if (!fromEntity || !entityStates) return 'normal';
  const src = entityStates[fromEntity] ?? 'normal';
  return applyDamping(src, dampingFactor);
}

// ── BeltOverlay ───────────────────────────────────────────────────────────────

interface BeltOverlayProps {
  px: number; py: number; pz: number;
  sx: number; sz: number;
  signal: string;
}

function BeltOverlay({ px, py, pz, sx, sz, signal }: BeltOverlayProps) {
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
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

function CorridorOverlay({ xCenter, xLen, lz, signal }: { xCenter: number; xLen: number; lz: number; signal: string }) {
  return <BeltOverlay px={xCenter} py={0.96} pz={lz} sx={xLen - 0.1} sz={0.64} signal={signal} />;
}

function ArmOverlay({ ax, ay, az, armLen, signal }: { ax: number; ay: number; az: number; armLen: number; signal: string }) {
  return <BeltOverlay px={ax} py={ay} pz={az} sx={0.64} sz={armLen - 0.1} signal={signal} />;
}

// ── FaultBeacon ───────────────────────────────────────────────────────────────

const BEACON_COL: Record<string, { col: string; emissive: string }> = {
  normal:   { col: '#22DD44', emissive: '#118822' },
  warning:  { col: '#FF8800', emissive: '#CC4400' },
  critical: { col: '#FF2828', emissive: '#CC0000' },
  failure:  { col: '#880000', emissive: '#440000' },
};

interface FaultBeaconProps {
  position: [number, number, number];
  state?: string;
}

function FaultBeacon({ position, state = 'normal' }: FaultBeaconProps) {
  const matRef   = useRef<THREE.MeshStandardMaterial | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
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

// ── Live fallback entity states ───────────────────────────────────────────────

const LIVE_ENTITY_STATES: Record<string, string> = {
  blister_machine:     'warning',
  cartoner:            'critical',
  serialization_queue: 'warning',
};

// ── EnvironmentDetails ────────────────────────────────────────────────────────

interface EnvironmentDetailsProps {
  floorConfig: FloorConfig | null;
  dark?: boolean;
}

export const EnvironmentDetails = ({ floorConfig, dark = true }: EnvironmentDetailsProps) => {
  const lines      = floorConfig?.lines      ?? [];
  const causalSegs = floorConfig?.causalSegs ?? [];
  const armSeg     = floorConfig?.armSeg     ?? null;
  const cleanRooms = floorConfig?.cleanRooms ?? [];
  const bounds     = floorConfig?.bounds     ?? { w: 18.5, d: 14.0, cx: -1.0, cz: 2.25 };

  const simulation = useAppStore(useShallow(selectSimulationContext));

  const entityStates = useMemo<Record<string, string>>(
    () => resolveSimulationEntityStates(simulation, LIVE_ENTITY_STATES, lookupPastStates),
    [simulation]
  );

  return (
  <group>
    {/* ── Floor zones ──────────────────────────────────────────── */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.cx, -0.001, bounds.cz]} receiveShadow>
      <planeGeometry args={[bounds.w, bounds.d]} />
      <meshStandardMaterial color={dark ? "#243245" : "#d7dee6"} roughness={1.0} metalness={0} />
    </mesh>
    {cleanRooms.map((p, i) => (
      <mesh key={`cleanA-${i}`} position={[p.cx, 0.025, p.cz]} receiveShadow>
        <boxGeometry args={[3.5, 0.05, 4.5]} />
        <meshStandardMaterial color={dark ? "#45536B" : "#eef2f6"} roughness={1.0} metalness={0} />
      </mesh>
    ))}
    {lines.map(({ lz }, i) => (
      <mesh key={`corr-${i}`} position={[-0.5, 0.03, lz]} receiveShadow>
        <boxGeometry args={[15.5, 0.06, 2.2]} />
        <meshStandardMaterial color={dark ? "#56647A" : "#e3e9ef"} roughness={1.0} metalness={0} />
      </mesh>
    ))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.002, 2.25]} receiveShadow>
      <planeGeometry args={[15.5, 2.1]} />
      <meshStandardMaterial color={dark ? "#3D4B64" : "#f2f5f8"} roughness={1.0} metalness={0} />
    </mesh>
    {[-6.0, 7.0].map((x, i) => (
      <mesh key={`bound-${i}`} position={[x, 0.068, 2.25]}>
        <boxGeometry args={[0.05, 0.015, 9.5]} />
        <meshStandardMaterial color={dark ? "#64748C" : "#c6d0da"} roughness={1.0} metalness={0} />
      </mesh>
    ))}
    {lines.map(({ lz }, i) =>
      [-1.0, 1.0].map((dz, j) => (
        <mesh key={`safe-${i}-${j}`} position={[-0.5, 0.068, lz + dz]}>
          <boxGeometry args={[15.5, 0.02, 0.06]} />
          <meshStandardMaterial color={dark ? "#657590" : "#c1ccd7"} emissive={dark ? "#42546D" : "#dbe3eb"} emissiveIntensity={0.18} roughness={1.0} metalness={0} />
        </mesh>
      ))
    )}

    {/* ── HEPA filter units ────────────────────────────────────── */}
    {[{ x: -7.5, z: -2.5 }, { x: -1.5, z: 0 }, { x: -7.5, z: 7.0 }, { x: -1.5, z: 4.5 }].map((p, i) => (
      <mesh key={`hepa-${i}`} position={[p.x, 5.38, p.z]}>
        <boxGeometry args={[3.2, 0.16, 1.5]} />
        <meshStandardMaterial color={dark ? "#7285A1" : "#dde5ed"} metalness={0} roughness={1.0} />
      </mesh>
    ))}

    {/* ── Overhead process pipes ────────────────────────────────── */}
    {lines.map(({ lz, armZCenter, armLen }, i) => (
      <group key={`ovhd-${i}`}>
        <mesh position={[-0.25, 3.05, lz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.052, 0.052, 15.5, 8]} />
          <meshStandardMaterial color={dark ? "#697A94" : "#afbbc7"} metalness={0} roughness={1.0} />
        </mesh>
        <mesh position={[-7.5, 3.05, armZCenter]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, armLen, 8]} />
          <meshStandardMaterial color={dark ? "#60708A" : "#97a6b5"} metalness={0} roughness={1.0} />
        </mesh>
      </group>
    ))}

    {/* ── Cable tray ───────────────────────────────────────────── */}
    <mesh position={[-0.25, 3.28, -4.2]}>
      <boxGeometry args={[15.5, 0.07, 0.30]} />
      <meshStandardMaterial color={dark ? "#6A7B95" : "#afbbc7"} metalness={0} roughness={1.0} />
    </mesh>

    {/* ── L-shaped conveyor lines ──────────────────────────────── */}
    {lines.map(({ lz, armZCenter, armLen }, i) => (
      <group key={`conv-${i}`}>
        <mesh position={[-0.25, 0.88, lz]}>
          <boxGeometry args={[15.5, 0.14, 0.65]} />
          <primitive object={MAT.conveyor} attach="material" />
        </mesh>
        {[-0.36, 0.36].map((dz, j) => (
          <mesh key={j} position={[-0.25, 0.97, lz + dz]}>
            <boxGeometry args={[15.5, 0.10, 0.07]} />
            <primitive object={MAT.rail} attach="material" />
          </mesh>
        ))}
        {Array.from({ length: 22 }).map((_, k) => (
          <mesh key={k} position={[-7.4 + k * 0.72, 0.88, lz]}>
            <boxGeometry args={[0.06, 0.16, 0.67]} />
            <primitive object={MAT.roller} attach="material" />
          </mesh>
        ))}
        <mesh position={[-7.5, 0.88, lz]}>
          <boxGeometry args={[0.68, 0.14, 0.68]} />
          <primitive object={MAT.conveyor} attach="material" />
        </mesh>
        <mesh position={[-7.5, 0.88, armZCenter]}>
          <boxGeometry args={[0.65, 0.14, armLen]} />
          <primitive object={MAT.conveyor} attach="material" />
        </mesh>
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
    {lines.map(({ lz }, i) => (
      <mesh key={`feed-${i}`} position={[7.0, 0.8, lz]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
        <meshStandardMaterial color={dark ? "#3B4863" : "#A8D8EA"} emissive={dark ? "#1D2A3A" : "#75C5E6"} emissiveIntensity={0.15} metalness={0} roughness={1.0} />
      </mesh>
    ))}

    {/* ── RABS enclosures ──────────────────────────────────────── */}
    {[{ cx: -7.5, cz: -2.5 }, { cx: -7.5, cz: 7.0 }].map(({ cx, cz }, i) => (
      <group key={`rabs-${i}`}>
        {[[-1.55, -0.82], [-1.55, 0.82], [1.55, -0.82], [1.55, 0.82]].map(([dx, dz], j) => (
          <mesh key={j} position={[cx + dx, 1.4, cz + dz]}>
            <boxGeometry args={[0.07, 2.8, 0.07]} />
            <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} metalness={0} roughness={1.0} />
          </mesh>
        ))}
        {[-0.82, 0.82].map((dz, j) => (
          <mesh key={`tx-${j}`} position={[cx, 2.8, cz + dz]}>
            <boxGeometry args={[3.1, 0.065, 0.065]} />
            <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} metalness={0} roughness={1.0} />
          </mesh>
        ))}
        {[-1.55, 1.55].map((dx, j) => (
          <mesh key={`tz-${j}`} position={[cx + dx, 2.8, cz]}>
            <boxGeometry args={[0.065, 0.065, 1.64]} />
            <meshStandardMaterial color={dark ? "#4A5A7B" : "#DADCE0"} metalness={0} roughness={1.0} />
          </mesh>
        ))}
      </group>
    ))}

    {/* ── Belt signal overlays ─────────────────────────────────── */}
    {lines.map(({ lz, armZCenter, armLen }, i) => {
      const lineStates = (i === 1) ? {} : entityStates;
      const armSig  = armSeg ? beltSignal(armSeg.fromEntity, armSeg.dampingFactor, lineStates) : 'normal';
      return (
        <group key={`bso-${i}`}>
          <ArmOverlay ax={-7.5} ay={0.96} az={armZCenter} armLen={armLen} signal={armSig} />
          {causalSegs.map((seg, j) => (
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

    {/* ── Fault beacons ────────────────────────────────────────── */}
    <FaultBeacon position={[-7.5, 1.62, -2.5]} state={entityStates.blister_machine ?? 'normal'} />
    <FaultBeacon position={[-7.5, 1.62,  7.0]} state='normal' />

    {/* ── Sensors on BF-1101 ───────────────────────────────────── */}
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
