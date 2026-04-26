import * as THREE from 'three';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ColorKey  = 'g1' | 'g2' | 'g3' | 'g4' | 'g5';
export type LineTheme = 'l1' | 'l2';
export type EntityState = 'normal' | 'warning' | 'critical' | 'offline' | 'starved' | 'pending';

// [dark chassis, dark housing, light chassis, light housing]
type PaletteEntry = [string, string, string, string];

export interface ColorMats {
  chassis: THREE.MeshStandardMaterial;
  housing: THREE.MeshStandardMaterial;
  _dark:   { chassis: string; housing: string };
  _light:  { chassis: string; housing: string };
}

// ── Grey-shade palette ────────────────────────────────────────────────────────

const PALETTE: Record<ColorKey, PaletteEntry> = {
  g1: ['#58697c', '#6a7d92', '#b8c6d4', '#ccd8e4'],
  g2: ['#4a5868', '#5c6e82', '#a8b8c8', '#bcc8d8'],
  g3: ['#3e4e60', '#50617a', '#98aabc', '#aebccc'],
  g4: ['#344458', '#465670', '#8a9cb0', '#a0b0c4'],
  g5: ['#2e3c50', '#3e5062', '#7e92a8', '#96a8bc'],
};

export function makeMats(colorKey: ColorKey): ColorMats {
  const [dc, dh, lc, lh] = PALETTE[colorKey] ?? PALETTE.g1;
  const isDark = useAppStore.getState().dark;
  return {
    chassis: new THREE.MeshStandardMaterial({ color: isDark ? dc : lc, metalness: 0.06, roughness: 0.82 }),
    housing: new THREE.MeshStandardMaterial({ color: isDark ? dh : lh, metalness: 0.10, roughness: 0.65 }),
    _dark:  { chassis: dc, housing: dh },
    _light: { chassis: lc, housing: lh },
  };
}

export const MAT_REGISTRY: Partial<Record<ColorKey, ColorMats>> = {};

export function getColorMats(colorKey: ColorKey): ColorMats {
  if (!MAT_REGISTRY[colorKey]) MAT_REGISTRY[colorKey] = makeMats(colorKey);
  return MAT_REGISTRY[colorKey]!;
}

export const BODY_MATS: ColorMats = getColorMats('g1');

// ── Flat matte map materials ──────────────────────────────────────────────────

const MM: THREE.MeshStandardMaterialParameters = { metalness: 0.0, roughness: 1.0 };

export const MAT = {
  pipe:            new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  plinth:          new THREE.MeshStandardMaterial({ color: '#3B4A6B', ...MM }),
  panel:           new THREE.MeshStandardMaterial({ color: '#5A6D8F', ...MM }),
  panelL2:         new THREE.MeshStandardMaterial({ color: '#455475', ...MM }),
  screen:          new THREE.MeshStandardMaterial({ color: '#0B1622', emissive: '#2AF1E5', emissiveIntensity: 0.40, ...MM }),
  screenL2:        new THREE.MeshStandardMaterial({ color: '#0B1622', emissive: '#2AF1E5', emissiveIntensity: 0.55, ...MM }),
  tag:             new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  tagL2:           new THREE.MeshStandardMaterial({ color: '#3B4A6B', ...MM }),
  conduit:         new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  rabsGlass:       new THREE.MeshStandardMaterial({ color: '#2AF1E5', transparent: true, opacity: 0.08, side: THREE.DoubleSide, ...MM }),
  rabsFrame:       new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  conveyor:        new THREE.MeshStandardMaterial({ color: '#1A202C', ...MM }),
  rail:            new THREE.MeshStandardMaterial({ color: '#2D3748', ...MM }),
  roller:          new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  line:            new THREE.MeshStandardMaterial({ color: '#2AF1E5', ...MM }),
  floorArrow:      new THREE.MeshStandardMaterial({ color: '#3B4A6B', ...MM }),
  zone:            new THREE.MeshStandardMaterial({ color: '#33415C', ...MM }),
  dashCover:       new THREE.MeshStandardMaterial({ color: '#33415C', ...MM }),
  airPipe:         new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  drain:           new THREE.MeshStandardMaterial({ color: '#273143', ...MM }),
  drainCover:      new THREE.MeshStandardMaterial({ color: '#1A202C', ...MM }),
  darkMachinery:   new THREE.MeshStandardMaterial({ color: '#1A202C', ...MM }),
  faultBeaconBase: new THREE.MeshStandardMaterial({ color: '#4A5A7B', ...MM }),
  faultBeaconColor:new THREE.MeshStandardMaterial({ color: '#FF3333', emissive: '#FF3333', emissiveIntensity: 3.5, transparent: true, opacity: 0.90, ...MM }),
} as const;

export type MatKey = keyof typeof MAT;

export const LINE_THEME_MATS: Record<LineTheme, { panel: THREE.MeshStandardMaterial; screen: THREE.MeshStandardMaterial; tag: THREE.MeshStandardMaterial }> = {
  l1: { panel: MAT.panel,   screen: MAT.screen,   tag: MAT.tag   },
  l2: { panel: MAT.panelL2, screen: MAT.screenL2, tag: MAT.tagL2 },
};

export const SKEU_MATS = {
  chassis:  new THREE.MeshStandardMaterial({ color: '#5A6D8F', ...MM }),
  housing:  new THREE.MeshStandardMaterial({ color: '#6A7D9F', ...MM }),
  conveyor: new THREE.MeshStandardMaterial({ color: '#1A202C', ...MM }),
  glass:    new THREE.MeshStandardMaterial({ color: '#2AF1E5', transparent: true, opacity: 0.12, ...MM }),
} as const;

// ── State materials ───────────────────────────────────────────────────────────

export const STATE_COLORS: Record<string, THREE.MeshStandardMaterial> = {
  critical: new THREE.MeshStandardMaterial({ color: '#ECE8E2', emissive: '#c04030', emissiveIntensity: 0.05, metalness: 0.12, roughness: 0.60 }),
  warning:  new THREE.MeshStandardMaterial({ color: '#ECEAE0', emissive: '#b07820', emissiveIntensity: 0.04, metalness: 0.12, roughness: 0.60 }),
  normal:   new THREE.MeshStandardMaterial({ color: '#E8E6E0', emissive: '#304838', emissiveIntensity: 0.02, metalness: 0.14, roughness: 0.60 }),
};

export const STATE_ACCENTS: Record<string, THREE.MeshStandardMaterial> = {
  critical: new THREE.MeshStandardMaterial({ color: '#FF3333', emissive: '#CC0000', emissiveIntensity: 0.85, metalness: 0, roughness: 1.0 }),
  warning:  new THREE.MeshStandardMaterial({ color: '#FFB800', emissive: '#CC8800', emissiveIntensity: 0.80, metalness: 0, roughness: 1.0 }),
  normal:   new THREE.MeshStandardMaterial({ color: '#2AF1E5', emissive: '#05B5A5', emissiveIntensity: 0.85, metalness: 0, roughness: 1.0 }),
};

export const STATUS_LED: Record<EntityState, THREE.MeshStandardMaterial> = {
  critical: new THREE.MeshStandardMaterial({ color: '#FF6666', emissive: '#FF3333', emissiveIntensity: 1.5 }),
  warning:  new THREE.MeshStandardMaterial({ color: '#FFCC33', emissive: '#FFB800', emissiveIntensity: 1.5 }),
  normal:   new THREE.MeshStandardMaterial({ color: '#A5FCF5', emissive: '#2AF1E5', emissiveIntensity: 1.5 }),
  offline:  new THREE.MeshStandardMaterial({ color: '#374151', emissive: '#1F2937', emissiveIntensity: 0.1 }),
  starved:  new THREE.MeshStandardMaterial({ color: '#374151', emissive: '#1F2937', emissiveIntensity: 0.1 }),
  pending:  new THREE.MeshStandardMaterial({ color: '#3b82f6', emissive: '#1d4ed8', emissiveIntensity: 0.6 }),
};

export const RUN_LED     = new THREE.MeshStandardMaterial({ color: '#60aaee', emissive: '#4088cc', emissiveIntensity: 1.5 });
export const RUN_LED_L2  = new THREE.MeshStandardMaterial({ color: '#88ccff', emissive: '#88ccff', emissiveIntensity: 1.5 });

export const STATUS_LED_BY_THEME: Record<LineTheme, Record<EntityState, THREE.MeshStandardMaterial>> = {
  l1: STATUS_LED,
  l2: STATUS_LED,
};

export const RUN_LED_BY_THEME: Record<LineTheme, THREE.MeshStandardMaterial> = {
  l1: RUN_LED,
  l2: RUN_LED_L2,
};

// ── MapThemeManager ───────────────────────────────────────────────────────────

interface MapThemeManagerProps {
  darkOverride?: boolean;
}

export function MapThemeManager({ darkOverride }: MapThemeManagerProps = {}): null {
  const dark = useAppStore(s => s.dark);
  const effectiveDark = darkOverride ?? dark;
  const { invalidate } = useThree();

  useEffect(() => {
    Object.values(MAT_REGISTRY).forEach(m => {
      m!.chassis.color.set(effectiveDark ? m!._dark.chassis : m!._light.chassis);
      m!.housing.color.set(effectiveDark ? m!._dark.housing : m!._light.housing);
      m!.chassis.needsUpdate = true;
      m!.housing.needsUpdate = true;
    });
    invalidate();
  }, [effectiveDark, invalidate]);

  useEffect(() => {
    if (effectiveDark) {
      MAT.panel.color.set('#3a4656');         SKEU_MATS.chassis.color.set('#3a4656');
      MAT.plinth.color.set('#1d2838');        MAT.panelL2.color.set('#1d2838');
      MAT.drain.color.set('#1d2838');         MAT.drainCover.color.set('#1d2838');
      MAT.darkMachinery.color.set('#1d2838'); SKEU_MATS.housing.color.set('#1d2838');
      MAT.pipe.color.set('#728093');          MAT.tag.color.set('#728093');
      MAT.tagL2.color.set('#728093');         MAT.conduit.color.set('#728093');
      MAT.rabsFrame.color.set('#728093');     MAT.roller.color.set('#728093');
      MAT.airPipe.color.set('#728093');       MAT.faultBeaconBase.color.set('#728093');
      MAT.floorArrow.color.set('#728093');
      MAT.conveyor.color.set('#2e3a4a');      MAT.zone.color.set('#2e3a4a');
      MAT.dashCover.color.set('#2e3a4a');     SKEU_MATS.conveyor.color.set('#2e3a4a');
      MAT.rail.color.set('#6f7b8c');
      MAT.screen.color.set('#08111e');        MAT.screenL2.color.set('#08111e');
      MAT.rabsGlass.color.set('#2AF1E5');     MAT.line.color.set('#2AF1E5');
      SKEU_MATS.glass.color.set('#2AF1E5');
    } else {
      MAT.panel.color.set('#d8e0e8');         MAT.roller.color.set('#d8e0e8');
      MAT.floorArrow.color.set('#d8e0e8');    MAT.zone.color.set('#d8e0e8');
      MAT.dashCover.color.set('#d8e0e8');     MAT.drain.color.set('#d8e0e8');
      SKEU_MATS.chassis.color.set('#d8e0e8');
      MAT.plinth.color.set('#b3bfcb');        MAT.panelL2.color.set('#b3bfcb');
      MAT.drainCover.color.set('#b3bfcb');    SKEU_MATS.housing.color.set('#b3bfcb');
      SKEU_MATS.conveyor.color.set('#b3bfcb');
      MAT.pipe.color.set('#8794a3');          MAT.tag.color.set('#8794a3');
      MAT.tagL2.color.set('#8794a3');         MAT.conduit.color.set('#8794a3');
      MAT.rabsFrame.color.set('#8794a3');     MAT.airPipe.color.set('#8794a3');
      MAT.faultBeaconBase.color.set('#8794a3'); MAT.darkMachinery.color.set('#8794a3');
      MAT.conveyor.color.set('#c7d1db');
      MAT.rail.color.set('#99a7b7');
      MAT.screen.color.set('#334155');        MAT.screenL2.color.set('#334155');
      MAT.rabsGlass.color.set('#3b82f6');     MAT.line.color.set('#dde4eb');
      SKEU_MATS.glass.color.set('#3b82f6');
    }
    Object.values(MAT).forEach(m => { m.needsUpdate = true; });
    Object.values(SKEU_MATS).forEach(m => { m.needsUpdate = true; });
    invalidate();
  }, [effectiveDark, invalidate]);

  return null;
}
