import React, { useState, useMemo, useRef } from 'react';
import { RoundedBox, Html, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAT, SKEU_MATS, STATE_ACCENTS, STATUS_LED, STATUS_LED_L2, RUN_LED, RUN_LED_L2 } from './FloorMapMaterials';

// Per-machine-type surface — distinct hue + lightness + roughness/metalness
// Each machine catches light differently, like Google Maps buildings:
//   chassis = body/base (matte, shadowed)
//   housing = panels/top (varies: some shiny metal, some smooth, some matte)
const SHADES = {
  // Blister Former — heavy industrial, mostly matte, cool blue-grey
  BlisterMachine: {
    chassis: '#96A8C0', housing: '#B4C4D4',
    chassisR: 0.88, chassisM: 0.06,
    housingR: 0.62, housingM: 0.10,
  },
  // Cartoner — polished metal panels, shinier housing catches strong highlights
  Cartoner: {
    chassis: '#8898B4', housing: '#C0CEDC',
    chassisR: 0.80, chassisM: 0.10,
    housingR: 0.18, housingM: 0.22,
  },
  // Serialization Station — neutral workhorse, mid roughness
  SerializationStation: {
    chassis: '#AEBCCA', housing: '#C8D4DF',
    chassisR: 0.82, chassisM: 0.06,
    housingR: 0.50, housingM: 0.10,
  },
  // Inspection Machine — optical instrument, smoothest housing
  InspectionMachine: {
    chassis: '#8494B0', housing: '#A4B4CC',
    chassisR: 0.76, chassisM: 0.10,
    housingR: 0.12, housingM: 0.28,
  },
  // Checkweigher — widest, most utilitarian, heaviest matte
  Checkweigher: {
    chassis: '#B2BEC8', housing: '#C8D2DA',
    chassisR: 0.92, chassisM: 0.03,
    housingR: 0.88, housingM: 0.04,
  },
  // Labeler — compact, slightly warmer grey, semi-specular
  Labeler: {
    chassis: '#9CAEC0', housing: '#B6C6D4',
    chassisR: 0.74, chassisM: 0.10,
    housingR: 0.36, housingM: 0.15,
  },
};

// Control panel — screen + status LED on front face of every machine
const ControlPanel = ({ eq, isL2 }) => {
  const panelZ = eq.d / 2 + 0.05;
  const panelW = eq.w * 0.58;
  const panelH = eq.h * 0.44;

  return (
    <group position={[0, 0, panelZ]}>
      <RoundedBox args={[panelW, panelH, 0.055]} radius={0.02} smoothness={3}>
        <primitive object={isL2 ? MAT.panelL2 : MAT.panel} attach="material" />
      </RoundedBox>
      <mesh position={[0, panelH * 0.10, 0.035]}>
        <boxGeometry args={[panelW * 0.65, panelH * 0.40, 0.02]} />
        <primitive object={isL2 ? MAT.screenL2 : MAT.screen} attach="material" />
      </mesh>
      <mesh position={[-panelW * 0.25, -panelH * 0.28, 0.038]}>
        <sphereGeometry args={[0.034, 8, 8]} />
        <primitive object={isL2 ? STATUS_LED_L2[eq.state] : STATUS_LED[eq.state]} attach="material" />
      </mesh>
      <mesh position={[panelW * 0.25, -panelH * 0.28, 0.038]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <primitive object={isL2 ? RUN_LED_L2 : RUN_LED} attach="material" />
      </mesh>
    </group>
  );
};

const TARGET_COLORS = {
  normal:   { c: '#10B981', e: '#047857', i: 0.75 },
  warning:  { c: '#F59E0B', e: '#B45309', i: 0.80 },
  critical: { c: '#EF4444', e: '#B91C1C', i: 0.85 },
  offline:  { c: '#374151', e: '#1F2937', i: 0.0 },
  starved:  { c: '#374151', e: '#1F2937', i: 0.0 },
  pending:  { c: '#1d4ed8', e: '#1e40af', i: 0.3 },
};

function AnimatedCap({ state, w, capY, d, isCw }) {
  const target = TARGET_COLORS[state] || TARGET_COLORS.normal;
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

const TARGET_ORB = {
  normal:   { s: 0, c: '#000000', e: '#000000', l: 0 },
  warning:  { s: 1, c: '#FFB800', e: '#CC8800', l: 2.0 },
  critical: { s: 1, c: '#FF3333', e: '#CC0000', l: 3.0 },
  offline:  { s: 0, c: '#000000', e: '#000000', l: 0 },
  starved:  { s: 0, c: '#000000', e: '#000000', l: 0 },
  pending:  { s: 0, c: '#000000', e: '#000000', l: 0 },
};

function AnimatedOrb({ state, h }) {
  const target = TARGET_ORB[state] || TARGET_ORB.normal;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0 }), []);
  const tc = useMemo(() => new THREE.Color(), []);
  const te = useMemo(() => new THREE.Color(), []);
  const groupRef = useRef();
  const lightRef = useRef();

  useFrame((_, delta) => {
    tc.set(target.c);
    te.set(target.e);
    mat.color.lerp(tc, delta * 6);
    mat.emissive.lerp(te, delta * 6);
    mat.emissiveIntensity = 3.0; // keep it blazing
    
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
      {/* Animated scaled beacon/orb/light group */}
      <group ref={groupRef} scale={[0,0,0]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.22, 6]} />
          <meshStandardMaterial color="#8898AC" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.12, 14, 10]} />
          <primitive object={mat} attach="material" />
        </mesh>
        {/* Glow cast onto surroundings */}
        <pointLight ref={lightRef} distance={5} decay={2} intensity={0} />
      </group>
    </group>
  );
}

const METRIC_COLOR = { crit: '#EF4444', warn: '#F59E0B', ok: '#10B981' };
const STATE_BADGE_COLOR = { critical: '#B91C1C', warning: '#B45309', normal: '#047857' };

const OntoCard = ({ eq }) => (
  <div style={{
    background: '#0B1622',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '8px',
    padding: '8px 12px 9px',
    pointerEvents: 'none',
    boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
    transform: 'translateY(-6px)',
    WebkitFontSmoothing: 'antialiased',
    whiteSpace: 'nowrap',
  }}>
    {/* Header row */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#E8F0FF', letterSpacing: '0.07em' }}>{eq.label}</div>
        {eq.type && <div style={{ fontSize: '9px', color: 'rgba(180,200,225,0.50)', fontWeight: 500, marginTop: '1px' }}>{eq.type}</div>}
      </div>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
        background: STATE_BADGE_COLOR[eq.state], color: '#fff',
        borderRadius: '5px', padding: '2px 6px', alignSelf: 'flex-start',
      }}>{eq.stateLabel}</span>
    </div>
    {/* Metrics — horizontal columns, each with tag + label + value */}
    <div style={{ display: 'flex', gap: '14px' }}>
      {(eq.metrics || []).map((m, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(140,170,210,0.55)', letterSpacing: '0.06em' }}>{m.tag}</span>
          <span style={{ fontSize: '9px', color: 'rgba(180,200,225,0.55)', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{m.label}</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: METRIC_COLOR[m.s], letterSpacing: '0.02em', marginTop: '1px' }}>{m.value}</span>
        </div>
      ))}
    </div>
    {/* Leader line downward to ground it */}
    <div style={{
      position: 'absolute', top: '100%', left: '50%', width: '1px', height: '60px',
      background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
      transform: 'translateX(-50%)',
    }} />
  </div>
);

// Base: plinth + state-color cap (no z-fighting) + warning/critical orb
const BaseEquipment = ({ eq, children, isL2 = false, onClick, hoveredId, setHoveredId }) => {
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
      <RoundedBox args={[pw, 0.06, pd]} radius={0.015} smoothness={3}
        position={[0, -eq.h / 2 + 0.03, 0]} receiveShadow>
        <primitive object={SKEU_MATS.chassis} attach="material" />
      </RoundedBox>
      {/* State-color cap */}
      <AnimatedCap state={eq.state} w={eq.w} d={eq.d} capY={capY} isCw={eq.id.includes('cw_')} />
      
      {/* Warning/critical orb — glowing beacon above the machine */}
      <AnimatedOrb state={eq.state} h={eq.h} />
      
      <ControlPanel eq={eq} isL2={isL2} />
      
      {/* Glancable In-World Micro-Data */}
      {eq.metrics && eq.metrics.length > 0 && !hovered && !isOther && (
        <Text
          position={[0, eq.h / 2 + 0.15, eq.d / 2 + 0.1]}
          fontSize={0.11}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#000000"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf"
        >
          {eq.metrics[0].value}
        </Text>
      )}

      {hovered && (
        <Html position={[0, eq.h / 2 + 0.85, 0]} center zIndexRange={[300, 0]} pointerEvents={false}>
          <OntoCard eq={eq} />
        </Html>
      )}
    </group>
  );
};

export const BlisterMachine = ({ eq, isL2, onClick, hoveredId, setHoveredId }) => {
  const s = SHADES.BlisterMachine;
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.40 }} isL2={isL2} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <RoundedBox args={[eq.w, eq.h * 0.35, eq.d * 0.9]} radius={0.06} smoothness={3}
        position={[0, -eq.h * 0.30, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
      </RoundedBox>
      <RoundedBox args={[eq.w, eq.h * 0.35, eq.d]} radius={0.04} smoothness={3}
        position={[0, 0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.housing} roughness={s.housingR} metalness={s.housingM} />
      </RoundedBox>
      <mesh position={[0, eq.h * 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, eq.w * 0.60, 12]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
    </BaseEquipment>
  );
};

export const Cartoner = ({ eq, isL2, onClick, hoveredId, setHoveredId }) => {
  const s = SHADES.Cartoner;
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.41 }} isL2={isL2} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <RoundedBox args={[eq.w, eq.h * 0.40, eq.d]} radius={0.06} smoothness={3}
        position={[0, -eq.h * 0.28, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
      </RoundedBox>
      <RoundedBox args={[eq.w * 0.30, eq.h * 0.70, eq.d * 0.40]} radius={0.04} smoothness={3}
        position={[-eq.w * 0.38, eq.h * 0.10, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.housing} roughness={s.housingR} metalness={s.housingM} />
      </RoundedBox>
      <RoundedBox args={[eq.w * 0.98, eq.h * 0.20, eq.d * 0.98]} radius={0.02} smoothness={3}
        position={[0, -eq.h * 0.02, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.housing} roughness={s.housingR} metalness={s.housingM} />
      </RoundedBox>
    </BaseEquipment>
  );
};

export const SerializationStation = ({ eq, isL2, onClick, hoveredId, setHoveredId }) => {
  const s = SHADES.SerializationStation;
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.40 }} isL2={isL2} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <RoundedBox args={[eq.w, eq.h * 0.45, eq.d]} radius={0.05} smoothness={3}
        position={[0, -eq.h * 0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
      </RoundedBox>
      <RoundedBox args={[eq.w * 0.95, eq.h * 0.15, eq.d * 0.95]} radius={0.02} smoothness={3}
        position={[0, 0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.housing} roughness={s.housingR} metalness={s.housingM} />
      </RoundedBox>
      {[-eq.w * 0.38, eq.w * 0.38].map((x, i) => (
        <mesh key={i} position={[x, eq.h * 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, eq.h * 0.55, 0.06]} />
          <primitive object={MAT.pipe} attach="material" />
        </mesh>
      ))}
    </BaseEquipment>
  );
};

export const InspectionMachine = ({ eq, isL2, onClick, hoveredId, setHoveredId }) => {
  const s = SHADES.InspectionMachine;
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.55 }} isL2={isL2} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <RoundedBox args={[eq.w, eq.h * 0.45, eq.d]} radius={0.05} smoothness={3}
        position={[0, -eq.h * 0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
      </RoundedBox>
      <mesh position={[0, eq.h * 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, eq.h * 0.55, 12]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
      <mesh position={[0, eq.h * 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.40, 0.20, 0.40]} />
        <meshStandardMaterial color={s.housing} roughness={s.housingR} metalness={s.housingM} />
      </mesh>
    </BaseEquipment>
  );
};

export const Checkweigher = ({ eq, isL2, onClick, hoveredId, setHoveredId }) => {
  const s = SHADES.Checkweigher;
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.25 }} isL2={isL2} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <RoundedBox args={[eq.w * 1.28, eq.h * 0.30, eq.d * 1.18]} radius={0.04} smoothness={3}
        position={[0, -eq.h * 0.33, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
      </RoundedBox>
      <mesh position={[0, -eq.h * 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[eq.w * 1.20, 0.04, eq.d * 0.6]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
      {[-eq.w * 0.48, eq.w * 0.48].map((x, i) => (
        <mesh key={i} position={[x, eq.h * 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, eq.h * 0.58, 0.06]} />
          <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
        </mesh>
      ))}
    </BaseEquipment>
  );
};

export const Labeler = ({ eq, isL2, onClick, hoveredId, setHoveredId }) => {
  const s = SHADES.Labeler;
  return (
    <BaseEquipment eq={{ ...eq, topY: eq.h * 0.33 }} isL2={isL2} onClick={onClick} hoveredId={hoveredId} setHoveredId={setHoveredId}>
      <RoundedBox args={[eq.w, eq.h * 0.45, eq.d]} radius={0.06} smoothness={3}
        position={[0, -eq.h * 0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.chassis} roughness={s.chassisR} metalness={s.chassisM} />
      </RoundedBox>
      <RoundedBox args={[eq.w * 0.98, eq.h * 0.20, eq.d * 0.98]} radius={0.02} smoothness={3}
        position={[0, 0.10, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={s.housing} roughness={s.housingR} metalness={s.housingM} />
      </RoundedBox>
      <mesh position={[eq.w * 0.55, eq.h * 0.10, 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.15, 12]} />
        <primitive object={SKEU_MATS.conveyor} attach="material" />
      </mesh>
    </BaseEquipment>
  );
};
