import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LineTheme } from './FloorMapMaterials';
import type { FloorMachine } from '../../types/floor';

// ── Types ─────────────────────────────────────────────────────────────────────

type EqPosition = Pick<FloorMachine, 'x' | 'z' | 'h'>;

// ── State colors ──────────────────────────────────────────────────────────────

const STATE_COL: Record<string, string> = {
  normal:   '#2AF1E5',
  warning:  '#FFB800',
  critical: '#FF3333',
  failure:  '#CC0000',
};

// ── FlowingVials ──────────────────────────────────────────────────────────────

interface FlowingVialsProps {
  lineTheme?: LineTheme;
  zPos?: number;
  offlineXRanges?: Array<[number, number]>;
}

export const FlowingVials = ({ lineTheme = 'l1', zPos = 0, offlineXRanges = [] }: FlowingVialsProps) => {
  const vialGeo = useMemo(() => new THREE.CylinderGeometry(0.048, 0.048, 0.19, 10), []);
  const vialMat = useMemo(() => lineTheme === 'l2'
    ? new THREE.MeshStandardMaterial({
        color: 0xc0ecd8, emissive: 0x106040, emissiveIntensity: 0.20,
        metalness: 0.0, roughness: 0.05, transparent: true, opacity: 0.55,
      })
    : new THREE.MeshStandardMaterial({
        color: 0xdcecf8, emissive: 0x6090b0, emissiveIntensity: 0.04,
        metalness: 0.0, roughness: 0.08, transparent: true, opacity: 0.45,
      }), [lineTheme]);

  const groupRef = useRef<THREE.Group>(null);
  const offlineRef = useRef(offlineXRanges);
  useEffect(() => { offlineRef.current = offlineXRanges; }, [offlineXRanges]);
  const { invalidate } = useThree();
  const accRef = useRef(0);

  useFrame((_, delta) => {
    accRef.current += delta;
    if (accRef.current < 1 / 30) { invalidate(); return; }
    accRef.current -= 1 / 30;
    if (!groupRef.current) return;
    const ranges = offlineRef.current;
    groupRef.current.children.forEach(v => {
      const mesh = v as THREE.Mesh;
      const nextX = mesh.position.x + 1.5 * (1 / 30);
      const blocker = ranges.find(([lo]) => mesh.position.x < lo && nextX >= lo);
      if (blocker) {
        mesh.position.x = blocker[0] - 0.08;
      } else {
        mesh.position.x = nextX > 8.5 ? nextX - 17 : nextX;
      }
      mesh.visible = true;
    });
    invalidate();
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} geometry={vialGeo} material={vialMat}
          position={[-8.5 + i * (17 / 8), 1.03, zPos]} />
      ))}
    </group>
  );
};

// ── Arc routing ───────────────────────────────────────────────────────────────

function arcPoints(fromEq: EqPosition, toEq: EqPosition): THREE.Vector3[] {
  const { x: x1, z: z1, h: h1 } = fromEq;
  const { x: x2, z: z2, h: h2 } = toEq;
  const startY  = h1 + 0.5;
  const endY    = h2 + 0.4;
  const peakY   = Math.max(h1, h2) + 2.8;
  const sameCol = Math.abs(x1 - x2) < 0.5;

  if (sameCol) {
    const midZ  = (z1 + z2) / 2;
    const sign  = z2 - z1;
    const sweep = x1 - 0.8;
    return [
      new THREE.Vector3(x1,    startY,       z1),
      new THREE.Vector3(sweep, peakY,         midZ + sign * 0.3),
      new THREE.Vector3(sweep, peakY - 0.4,   midZ - sign * 0.3),
      new THREE.Vector3(x2,    endY,          z2),
    ];
  }
  const zOff = z1 < 2.25 ? -1.1 : 1.1;
  return [
    new THREE.Vector3(x1,                startY, z1),
    new THREE.Vector3(x1+(x2-x1)*0.3,   peakY,  z1+zOff),
    new THREE.Vector3(x1+(x2-x1)*0.7,   peakY,  z2+zOff),
    new THREE.Vector3(x2,                endY,   z2),
  ];
}

// ── CausalArcTube ─────────────────────────────────────────────────────────────

interface CausalArcTubeProps {
  fromEq: EqPosition;
  toEq: EqPosition;
  sourceState?: string;
  targetState?: string;
  drawProgress?: number;
}

export const CausalArcTube = ({
  fromEq, toEq,
  sourceState = 'normal', targetState = 'normal',
  drawProgress = 1,
}: CausalArcTubeProps) => {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(arcPoints(fromEq, toEq), false, 'catmullrom', 0.5),
    [fromEq, toEq]
  );

  const points = useMemo(() => curve.getPoints(96), [curve]);

  const colA = STATE_COL[sourceState] ?? STATE_COL.warning;
  const colB = STATE_COL[targetState] ?? STATE_COL.warning;

  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial> | null>(null);
  const targetProgRef = useRef(drawProgress);
  targetProgRef.current = drawProgress;
  const progRef = useRef(0);
  const { invalidate: invalidateArc } = useThree();
  const arcAccRef = useRef(0);

  const colorArray = useMemo(() => {
    const arr: number[] = [];
    const cA = new THREE.Color(colA);
    const cB = new THREE.Color(colB);
    for (let i = 0; i <= 96; i++) {
      const color = cA.clone().lerp(cB, i / 96);
      arr.push(color.r, color.g, color.b);
    }
    return arr;
  }, [colA, colB]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    g.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
    return g;
  }, [points, colorArray]);

  const material = useMemo(() => (
    new THREE.LineDashedMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      dashSize: 1,
      gapSize: 0.43,
      depthTest: false,
    })
  ), []);

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    line.computeLineDistances();
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    arcAccRef.current += delta;
    if (arcAccRef.current < 1 / 30) { invalidateArc(); return; }
    arcAccRef.current -= 1 / 30;
    progRef.current += (targetProgRef.current - progRef.current) * 0.15;
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset -= (1 / 30) * 1.5;
      lineRef.current.material.opacity = Math.max(0, progRef.current * 0.85);
    }
    invalidateArc();
  });

  if (drawProgress === 0) return null;

  return <line ref={lineRef} geometry={geometry} material={material} />;
};

// ── ConveyorBelt ──────────────────────────────────────────────────────────────

const STRIPE_COUNT = 7;
const STRIPE_SPACING = 1 / STRIPE_COUNT;

interface ConveyorBeltProps {
  x: number;
  z: number;
  length: number;
  isActive: boolean;
}

export const ConveyorBelt = ({ x, z, length, isActive }: ConveyorBeltProps) => {
  const offsetRef = useRef(0);
  const stripeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { invalidate: invalidateBelt } = useThree();
  const beltAccRef = useRef(0);

  const beltGeo  = useMemo(() => new THREE.BoxGeometry(length, 0.05, 0.35), [length]);
  const beltMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a2a3a', roughness: 0.85, metalness: 0.1,
  }), []);

  const stripeGeo = useMemo(() => new THREE.BoxGeometry(0.04, 0.07, 0.33), []);
  const stripeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a28', roughness: 0.9, metalness: 0.05,
  }), []);

  const railGeo  = useMemo(() => new THREE.BoxGeometry(length, 0.06, 0.03), [length]);
  const railMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#38384a', roughness: 0.7, metalness: 0.3,
  }), []);

  useFrame((_, delta) => {
    beltAccRef.current += delta;
    if (beltAccRef.current < 1 / 30) { if (isActive) invalidateBelt(); return; }
    beltAccRef.current -= 1 / 30;
    if (!isActive) return;
    offsetRef.current = (offsetRef.current + (1 / 30) * 1.2) % length;
    stripeRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const baseX = -length / 2 + ((i * STRIPE_SPACING * length + offsetRef.current) % length);
      ref.position.x = baseX;
    });
    invalidateBelt();
  });

  const initialXPositions = useMemo(() =>
    Array.from({ length: STRIPE_COUNT }, (_, i) =>
      -length / 2 + (i * STRIPE_SPACING * length)
    )
  , [length]);

  return (
    <group position={[x, 0.78, z]}>
      <mesh geometry={beltGeo} material={beltMat} />
      {initialXPositions.map((px, i) => (
        <mesh
          key={i}
          ref={el => { stripeRefs.current[i] = el; }}
          geometry={stripeGeo}
          material={stripeMat}
          position={[px, 0.031, 0]}
        />
      ))}
      <mesh geometry={railGeo} material={railMat} position={[0, 0.055, -0.18]} />
      <mesh geometry={railGeo} material={railMat} position={[0, 0.055,  0.18]} />
    </group>
  );
};
