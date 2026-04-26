import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { MotionValue } from 'framer-motion';
import type { Entity, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

const W   = 176;
const H   = 108;
const PAD = 14;

// Mid-tone zone colours — readable on the dark minimap background
const ZONE_DOT: Record<ZoneId, string> = {
  A: '#9CA3AF',
  B: '#EF4444',
  C: '#F59E0B',
  D: '#6366F1',
  E: '#BE185D',
  F: '#0D9488',
};

type MvEntry = { mx: MotionValue<number>; my: MotionValue<number> };
type NodeSize = { width: number; height: number };

interface BoardHandle {
  getBoardMVs: () => { mx: MotionValue<number>; my: MotionValue<number>; ms: MotionValue<number> };
  panTo: (args: { x: number; y: number; scale: number }) => void;
}

interface MiniMapProps {
  boardEntities: Entity[];
  positions: Record<string, Position>;
  sizes?: Record<string, NodeSize>;
  mvReg?: RefObject<Record<string, MvEntry>>;
  actualSizesRef?: RefObject<Record<string, NodeSize>>;
  boardRef?: RefObject<BoardHandle>;
  zoneMap: Record<string, ZoneId>;
  hiddenCount: number;
  onResetLayout?: () => void;
  dark?: boolean;
}

interface WorldTransform {
  scale: number;
  offX: number;
  offY: number;
  minX: number;
  minY: number;
}

export function MiniMap({ boardEntities, positions, sizes, mvReg, actualSizesRef, boardRef, zoneMap, hiddenCount, onResetLayout, dark }: MiniMapProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<WorldTransform | null>(null);
  const isDragging   = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frameId: number;

    const draw = () => {
      const nodes = boardEntities.map(e => {
        const mv = mvReg?.current?.[e.id];
        const x  = mv ? mv.mx.get() : (positions[e.id]?.x ?? 0);
        const y  = mv ? mv.my.get() : (positions[e.id]?.y ?? 0);
        const w  = actualSizesRef?.current?.[e.id]?.width  ?? sizes?.[e.id]?.width  ?? 320;
        const h  = actualSizesRef?.current?.[e.id]?.height ?? sizes?.[e.id]?.height ?? 160;
        return { id: e.id, x, y, w, h, zone: zoneMap[e.id] as ZoneId | undefined };
      });

      ctx.clearRect(0, 0, W, H);

      if (!nodes.length) { frameId = requestAnimationFrame(draw); return; }

      // World bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x);       minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
      });
      minX -= PAD; minY -= PAD; maxX += PAD; maxY += PAD;

      const worldW = maxX - minX || 1;
      const worldH = maxY - minY || 1;
      const scale  = Math.min(W / worldW, H / worldH);
      const offX   = (W - worldW * scale) / 2;
      const offY   = (H - worldH * scale) / 2;

      transformRef.current = { scale, offX, offY, minX, minY };

      const toX = (x: number) => (x - minX) * scale + offX;
      const toY = (y: number) => (y - minY) * scale + offY;

      // Node rectangles
      nodes.forEach(n => {
        const col = (n.zone ? ZONE_DOT[n.zone] : null) ?? '#666';
        const nx  = toX(n.x), ny = toY(n.y);
        const nw  = Math.max(n.w * scale, 4);
        const nh  = Math.max(n.h * scale, 3);
        ctx.fillStyle   = dark ? (col + '88') : (col + 'BB');
        ctx.strokeStyle = col + 'FF';
        ctx.lineWidth   = 0.5;
        ctx.fillRect(nx, ny, nw, nh);
        ctx.strokeRect(nx, ny, nw, nh);
      });

      // Viewport rectangle
      const bm = boardRef?.current?.getBoardMVs?.();
      if (bm) {
        const tx = bm.mx.get(), ty = bm.my.get(), ts = bm.ms.get();
        const vW = window.innerWidth, vH = window.innerHeight - 88;
        const rx = toX(-tx / ts),      ry = toY(-ty / ts);
        const rw = (vW / ts) * scale,  rh = (vH / ts) * scale;
        ctx.fillStyle   = dark ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.08)';
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.48)' : 'rgba(59,130,246,0.55)';
        ctx.lineWidth   = 1;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [boardEntities, positions, sizes, mvReg, actualSizesRef, boardRef, dark]);

  const panToPointer = (e: React.PointerEvent) => {
    const t  = transformRef.current;
    const bm = boardRef?.current?.getBoardMVs?.();
    if (!t || !bm || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx   = (e.clientX - rect.left) * (W / rect.width);
    const cy   = (e.clientY - rect.top)  * (H / rect.height);
    const wX   = (cx - t.offX) / t.scale + t.minX;
    const wY   = (cy - t.offY) / t.scale + t.minY;
    const ts   = bm.ms.get();
    boardRef!.current!.panTo({
      x:     -wX * ts + window.innerWidth  / 2,
      y:     -wY * ts + (window.innerHeight - 88) / 2,
      scale: ts,
    });
  };

  return (
    <div className="minimap">
      <div className="minimap-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>MAP</span>
        {hiddenCount > 0 && (
          <span className="minimap-hidden-count">+{hiddenCount} hidden</span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: '100%' }}
        onPointerDown={e => {
          isDragging.current = true;
          canvasRef.current!.setPointerCapture(e.pointerId);
          panToPointer(e);
        }}
        onPointerMove={e => { if (isDragging.current) panToPointer(e); }}
        onPointerUp={() => { isDragging.current = false; }}
      />
      {onResetLayout && (
        <div className="minimap-footer">
          <button className="minimap-btn" onClick={onResetLayout}>Reset layout</button>
        </div>
      )}
    </div>
  );
}
