import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Matches indicator pill colors exactly
const STATE_COL = {
  normal:   '#2AF1E5',
  warning:  '#FFB800',
  critical: '#FF3333',
  failure:  '#CC0000',
};

// ── FlowingVials ──────────────────────────────────────────────────────────────

export const FlowingVials = ({ isL2 }) => {
  const zPos = isL2 ? 4.5 : 0;
  const vialGeo = useMemo(() => new THREE.CylinderGeometry(0.048, 0.048, 0.19, 10), []);
  const vialMat = useMemo(() => isL2
    ? new THREE.MeshStandardMaterial({
        color: 0xc0ecd8, emissive: 0x106040, emissiveIntensity: 0.20,
        metalness: 0.0, roughness: 0.05, transparent: true, opacity: 0.55,
      })
    : new THREE.MeshStandardMaterial({
        color: 0xdcecf8, emissive: 0x6090b0, emissiveIntensity: 0.04,
        metalness: 0.0, roughness: 0.08, transparent: true, opacity: 0.45,
      }), [isL2]);

  const groupRef = useRef();
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach(v => {
      v.position.x += 1.5 * delta;
      if (v.position.x > 8.5) v.position.x -= 17;
    });
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

function arcPoints(fromEq, toEq) {
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

// ── Vector UI Line Arc (Replaces clunky 3D tube with pixel-perfect UI line) ──

export const CausalArcTube = ({
  fromEq, toEq,
  sourceState = 'normal', targetState = 'normal',
  drawProgress = 1,
}) => {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(arcPoints(fromEq, toEq), false, 'catmullrom', 0.5),
    [fromEq, toEq]
  );
  
  // High density of points for extremely smooth line rendering
  const points = useMemo(() => curve.getPoints(96), [curve]);
  
  const colA = STATE_COL[sourceState] ?? STATE_COL.warning;
  const colB = STATE_COL[targetState] ?? STATE_COL.warning;
  
  const lineRef = useRef();
  const targetProgRef = useRef(drawProgress);
  targetProgRef.current = drawProgress;
  const progRef = useRef(0);
  
  // Interpolated vertex colors for the gradient effect
  const colorArray = useMemo(() => {
    const arr = [];
    const cA = new THREE.Color(colA);
    const cB = new THREE.Color(colB);
    for(let i = 0; i <= 96; i++){
      arr.push(cA.clone().lerp(cB, i/96));
    }
    return arr;
  }, [colA, colB]);

  useFrame((_, delta) => {
    progRef.current += (targetProgRef.current - progRef.current) * 0.15;
    if (lineRef.current && lineRef.current.material) {
      // Sleek animated dash flow ("marching ants" effect) travelling from start to end
      lineRef.current.material.dashOffset -= delta * 1.5;
      lineRef.current.material.opacity = Math.max(0, progRef.current * 0.85);
    }
  });

  // If drawProgress is near 0, component shouldn't render significantly
  if (drawProgress === 0) return null;

  return (
    <Line
      ref={lineRef}
      points={points}
      color="white"
      vertexColors={colorArray}
      lineWidth={3.5}
      transparent
      dashed
      dashScale={20}
      dashSize={1}
      dashRatio={0.7}
      depthTest={false}
    />
  );
};
