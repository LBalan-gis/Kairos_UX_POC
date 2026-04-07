import { useEffect, useRef } from 'react';

const W   = 176;
const H   = 108;
const PAD = 14;

// Mid-tone zone colours — readable on the dark minimap background
const ZONE_DOT = {
  A: '#B08828', B: '#A84038', C: '#2858A0',
  D: '#A86F18', E: '#407830', F: '#606878',
};

export function MiniMap({ boardEntities, positions, sizes, mvReg, actualSizesRef, boardRef, zoneMap }) {
  const canvasRef    = useRef(null);
  const transformRef = useRef(null); // cached world→minimap transform for click handler
  const isDragging   = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;

    const draw = () => {
      const nodes = boardEntities.map(e => {
        const mv = mvReg?.current?.[e.id];
        const x  = mv ? mv.mx.get() : (positions[e.id]?.x ?? 0);
        const y  = mv ? mv.my.get() : (positions[e.id]?.y ?? 0);
        const w  = actualSizesRef?.current?.[e.id]?.width  ?? sizes?.[e.id]?.width  ?? 320;
        const h  = actualSizesRef?.current?.[e.id]?.height ?? sizes?.[e.id]?.height ?? 160;
        return { id: e.id, x, y, w, h, zone: zoneMap[e.id] };
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

      const toX = x => (x - minX) * scale + offX;
      const toY = y => (y - minY) * scale + offY;

      // Node rectangles
      nodes.forEach(n => {
        const col = ZONE_DOT[n.zone] ?? '#666';
        const nx  = toX(n.x), ny = toY(n.y);
        const nw  = Math.max(n.w * scale, 4);
        const nh  = Math.max(n.h * scale, 3);
        ctx.fillStyle   = col + '44';
        ctx.strokeStyle = col + 'BB';
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
        ctx.fillStyle   = 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = 'rgba(255,255,255,0.48)';
        ctx.lineWidth   = 1;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [boardEntities, positions, sizes, mvReg, actualSizesRef, boardRef]);

  const panToPointer = e => {
    const t  = transformRef.current;
    const bm = boardRef?.current?.getBoardMVs?.();
    if (!t || !bm) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx   = (e.clientX - rect.left) * (W / rect.width);
    const cy   = (e.clientY - rect.top)  * (H / rect.height);
    const wX   = (cx - t.offX) / t.scale + t.minX;
    const wY   = (cy - t.offY) / t.scale + t.minY;
    const ts   = bm.ms.get();
    boardRef.current.panTo({
      x:     -wX * ts + window.innerWidth  / 2,
      y:     -wY * ts + (window.innerHeight - 88) / 2,
      scale: ts,
    });
  };

  return (
    <div className="minimap">
      <div className="minimap-label">MAP</div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: '100%' }}
        onPointerDown={e => {
          isDragging.current = true;
          canvasRef.current.setPointerCapture(e.pointerId);
          panToPointer(e);
        }}
        onPointerMove={e => { if (isDragging.current) panToPointer(e); }}
        onPointerUp={() => { isDragging.current = false; }}
      />
    </div>
  );
}
