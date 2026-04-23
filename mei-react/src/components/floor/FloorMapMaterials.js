import * as THREE from 'three';
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

// Custom map-style flat matte materials (Google Maps Dark 3D aesthetic)
const MAP_MAT = { metalness: 0.0, roughness: 1.0 };

export const MAT = {
  pipe: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  plinth: new THREE.MeshStandardMaterial({ color: "#3B4A6B", ...MAP_MAT }),
  panel: new THREE.MeshStandardMaterial({ color: "#5A6D8F", ...MAP_MAT }),
  panelL2: new THREE.MeshStandardMaterial({ color: "#455475", ...MAP_MAT }),
  screen: new THREE.MeshStandardMaterial({ color: "#0B1622", emissive: "#2AF1E5", emissiveIntensity: 0.40, ...MAP_MAT }),
  screenL2: new THREE.MeshStandardMaterial({ color: "#0B1622", emissive: "#2AF1E5", emissiveIntensity: 0.55, ...MAP_MAT }),
  tag: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  tagL2: new THREE.MeshStandardMaterial({ color: "#3B4A6B", ...MAP_MAT }),
  conduit: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  rabsGlass: new THREE.MeshStandardMaterial({ color: "#2AF1E5", transparent: true, opacity: 0.08, side: THREE.DoubleSide, ...MAP_MAT }),
  rabsFrame: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  conveyor: new THREE.MeshStandardMaterial({ color: "#1A202C", ...MAP_MAT }),
  rail: new THREE.MeshStandardMaterial({ color: "#2D3748", ...MAP_MAT }),
  roller: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  line: new THREE.MeshStandardMaterial({ color: "#2AF1E5", ...MAP_MAT }),
  floorArrow: new THREE.MeshStandardMaterial({ color: "#3B4A6B", ...MAP_MAT }),
  zone: new THREE.MeshStandardMaterial({ color: "#33415C", ...MAP_MAT }),
  dashCover: new THREE.MeshStandardMaterial({ color: "#33415C", ...MAP_MAT }),
  airPipe: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  drain: new THREE.MeshStandardMaterial({ color: "#273143", ...MAP_MAT }),
  drainCover: new THREE.MeshStandardMaterial({ color: "#1A202C", ...MAP_MAT }),
  darkMachinery: new THREE.MeshStandardMaterial({ color: "#1A202C", ...MAP_MAT }),
  faultBeaconBase: new THREE.MeshStandardMaterial({ color: "#4A5A7B", ...MAP_MAT }),
  faultBeaconColor: new THREE.MeshStandardMaterial({ color: "#FF3333", emissive: "#FF3333", emissiveIntensity: 3.5, transparent: true, opacity: 0.90, ...MAP_MAT })
};

export const SKEU_MATS = {
  chassis: new THREE.MeshStandardMaterial({ color: "#5A6D8F", ...MAP_MAT }),
  housing: new THREE.MeshStandardMaterial({ color: "#6A7D9F", ...MAP_MAT }),
  conveyor: new THREE.MeshStandardMaterial({ color: "#1A202C", ...MAP_MAT }),
  glass: new THREE.MeshStandardMaterial({ color: "#2AF1E5", transparent: true, opacity: 0.12, ...MAP_MAT }),
};

export const STATE_COLORS = {
  critical: new THREE.MeshStandardMaterial({ color: "#ECE8E2", emissive: "#c04030", emissiveIntensity: 0.05, metalness: 0.12, roughness: 0.60 }),
  warning:  new THREE.MeshStandardMaterial({ color: "#ECEAE0", emissive: "#b07820", emissiveIntensity: 0.04, metalness: 0.12, roughness: 0.60 }),
  normal:   new THREE.MeshStandardMaterial({ color: "#E8E6E0", emissive: "#304838", emissiveIntensity: 0.02, metalness: 0.14, roughness: 0.60 }),
};

export const STATE_ACCENTS = {
  critical: new THREE.MeshStandardMaterial({ color: "#FF3333", emissive: "#CC0000", emissiveIntensity: 0.85, metalness: 0, roughness: 1.0 }),
  warning:  new THREE.MeshStandardMaterial({ color: "#FFB800", emissive: "#CC8800", emissiveIntensity: 0.80, metalness: 0, roughness: 1.0 }),
  normal:   new THREE.MeshStandardMaterial({ color: "#2AF1E5", emissive: "#05B5A5", emissiveIntensity: 0.85, metalness: 0, roughness: 1.0 }),
};

export const STATUS_LED = {
  critical: new THREE.MeshStandardMaterial({ color: "#FF6666", emissive: "#FF3333", emissiveIntensity: 1.5 }),
  warning:  new THREE.MeshStandardMaterial({ color: "#FFCC33", emissive: "#FFB800", emissiveIntensity: 1.5 }),
  normal:   new THREE.MeshStandardMaterial({ color: "#A5FCF5", emissive: "#2AF1E5", emissiveIntensity: 1.5 }),
  offline:  new THREE.MeshStandardMaterial({ color: "#374151", emissive: "#1F2937", emissiveIntensity: 0.1 }),
  starved:  new THREE.MeshStandardMaterial({ color: "#374151", emissive: "#1F2937", emissiveIntensity: 0.1 }),
  pending:  new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#1d4ed8", emissiveIntensity: 0.6 }),
};

export const STATUS_LED_L2 = {
  critical: new THREE.MeshStandardMaterial({ color: "#FF6666", emissive: "#FF3333", emissiveIntensity: 1.5 }),
  warning:  new THREE.MeshStandardMaterial({ color: "#FFCC33", emissive: "#FFB800", emissiveIntensity: 1.5 }),
  normal:   new THREE.MeshStandardMaterial({ color: "#A5FCF5", emissive: "#2AF1E5", emissiveIntensity: 1.5 }),
  offline:  new THREE.MeshStandardMaterial({ color: "#374151", emissive: "#1F2937", emissiveIntensity: 0.1 }),
  starved:  new THREE.MeshStandardMaterial({ color: "#374151", emissive: "#1F2937", emissiveIntensity: 0.1 }),
  pending:  new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#1d4ed8", emissiveIntensity: 0.6 }),
};

export const RUN_LED = new THREE.MeshStandardMaterial({ color: "#60aaee", emissive: "#4088cc", emissiveIntensity: 1.5 });

export function MapThemeManager() {
  const dark = useAppStore(s => s.dark);
  
  useEffect(() => {
    if (dark) {
       MAT.pipe.color.set("#4A5A7B");
       MAT.plinth.color.set("#3B4A6B");
       MAT.panel.color.set("#5A6D8F");
       MAT.panelL2.color.set("#455475");
       MAT.screen.color.set("#0B1622");
       MAT.screenL2.color.set("#0B1622");
       MAT.tag.color.set("#4A5A7B");
       MAT.tagL2.color.set("#3B4A6B");
       MAT.conduit.color.set("#4A5A7B");
       MAT.rabsGlass.color.set("#2AF1E5");
       MAT.rabsFrame.color.set("#4A5A7B");
       MAT.conveyor.color.set("#1A202C");
       MAT.rail.color.set("#2D3748");
       MAT.roller.color.set("#4A5A7B");
       MAT.line.color.set("#2AF1E5");
       MAT.floorArrow.color.set("#3B4A6B");
       MAT.zone.color.set("#33415C");
       MAT.dashCover.color.set("#33415C");
       MAT.airPipe.color.set("#4A5A7B");
       MAT.drain.color.set("#273143");
       MAT.drainCover.color.set("#1A202C");
       MAT.darkMachinery.color.set("#1A202C");
       MAT.faultBeaconBase.color.set("#4A5A7B");
       
       SKEU_MATS.chassis.color.set("#5A6D8F");
       SKEU_MATS.housing.color.set("#6A7D9F");
       SKEU_MATS.conveyor.color.set("#1A202C");
       SKEU_MATS.glass.color.set("#2AF1E5");
    } else {
       MAT.pipe.color.set("#BDC1C6");
       MAT.plinth.color.set("#DADCE0");
       MAT.panel.color.set("#E8EAED");
       MAT.panelL2.color.set("#9AA0A6");
       MAT.screen.color.set("#202124");
       MAT.screenL2.color.set("#202124");
       MAT.tag.color.set("#9AA0A6");
       MAT.tagL2.color.set("#7F878F");
       MAT.conduit.color.set("#BDC1C6");
       MAT.rabsGlass.color.set("#4285F4");
       MAT.rabsFrame.color.set("#DADCE0");
       MAT.conveyor.color.set("#9AA0A6");
       MAT.rail.color.set("#BDC1C6");
       MAT.roller.color.set("#DADCE0");
       MAT.line.color.set("#F1F3F4");
       MAT.floorArrow.color.set("#BDC1C6");
       MAT.zone.color.set("#E8EAED");
       MAT.dashCover.color.set("#E8EAED");
       MAT.airPipe.color.set("#A8D8EA");
       MAT.drain.color.set("#E8EAED");
       MAT.drainCover.color.set("#BDC1C6");
       MAT.darkMachinery.color.set("#5F6368");
       MAT.faultBeaconBase.color.set("#BDC1C6");
       
       SKEU_MATS.chassis.color.set("#E8EAED");
       SKEU_MATS.housing.color.set("#F1F3F4");
       SKEU_MATS.conveyor.color.set("#9AA0A6");
       SKEU_MATS.glass.color.set("#4285F4");
    }
    Object.values(MAT).forEach(m => m.needsUpdate = true);
    Object.values(SKEU_MATS).forEach(m => m.needsUpdate = true);
  }, [dark]);

  return null;
}
export const RUN_LED_L2 = new THREE.MeshStandardMaterial({ color: "#88ccff", emissive: "#88ccff", emissiveIntensity: 1.5 });
