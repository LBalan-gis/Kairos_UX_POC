import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import './graph.css';

export interface GraphBoardHandle {
  panTo: (args: { x: number; y: number; scale: number }) => void;
  getBoardMVs: () => { mx: MotionValue<number>; my: MotionValue<number>; ms: MotionValue<number> };
}

interface GraphBoardProps {
  children?: ReactNode;
  initialTransform?: { x?: number; y?: number; scale?: number };
  onBoardClick?: () => void;
}

interface PanState {
  px: number;
  py: number;
  ox: number;
  oy: number;
}

/**
 * High-performance Framer Motion spatial container.
 * Knows nothing about the store.
 */
export const GraphBoard = forwardRef<GraphBoardHandle, GraphBoardProps>(({ children, initialTransform, onBoardClick }, ref) => {
  const mx = useMotionValue(initialTransform?.x ?? 48);
  const my = useMotionValue(initialTransform?.y ?? 56);
  const ms = useMotionValue(initialTransform?.scale ?? 1);

  const panRef    = useRef<PanState | null>(null);
  const boardRef  = useRef<HTMLDivElement>(null);
  const didPanRef = useRef(false);

  useImperativeHandle(ref, () => ({
    panTo: ({ x, y, scale }) => {
      animate(mx, x, { type: 'spring', stiffness: 220, damping: 28 });
      animate(my, y, { type: 'spring', stiffness: 220, damping: 28 });
      animate(ms, scale, { type: 'spring', stiffness: 220, damping: 28 });
    },
    getBoardMVs: () => ({ mx, my, ms }),
  }));

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    didPanRef.current = false;
    panRef.current = {
      px: e.clientX, py: e.clientY,
      ox: mx.get(), oy: my.get(),
    };
    boardRef.current!.setPointerCapture(e.pointerId);
  }, [mx, my]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panRef.current) return;
    didPanRef.current = true;
    const { ox, oy, px, py } = panRef.current;
    mx.set(ox + (e.clientX - px));
    my.set(oy + (e.clientY - py));
  }, [mx, my]);

  const onPointerUp = useCallback(() => { panRef.current = null; }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta  = e.deltaY > 0 ? 0.92 : 1.08;
    const rect   = boardRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const currentScale = ms.get();
    const newScale = Math.min(2.2, Math.max(0.25, currentScale * delta));
    const ratio = newScale / currentScale;

    ms.set(newScale);
    mx.set(mouseX - ratio * (mouseX - mx.get()));
    my.set(mouseY - ratio * (mouseY - my.get()));
  }, [ms, mx, my]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onClick = useCallback(() => {
    if (didPanRef.current) { didPanRef.current = false; return; }
    onBoardClick?.();
  }, [onBoardClick]);

  return (
    <div
      ref={boardRef}
      className="graph-board"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
    >
      <motion.div
        className="graph-canvas"
        style={{ x: mx, y: my, scale: ms }}
      >
        {children}
      </motion.div>
    </div>
  );
});
