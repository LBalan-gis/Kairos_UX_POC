import { computeFitTransform } from '../../hooks/useLayout';
import type { Position } from '../../types/store';

export type GraphFitTransform = { x: number; y: number; scale: number };
export type GraphBoardRefApi = { panTo: (transform: GraphFitTransform) => void };
export type GraphSize = { width: number; height: number };
export type GraphSizeMap = Record<string, GraphSize>;
export type GraphPositionMap = Record<string, Position>;

export function shouldExitGraphFocus(focusId: string | null) {
  return focusId !== null;
}

export function buildGraphFocusTransform({
  neighborIds,
  positions,
  getSize,
  width,
  height,
}: {
  neighborIds: string[];
  positions: GraphPositionMap;
  getSize: (id: string) => GraphSize | undefined;
  width: number;
  height: number;
}) {
  if (!neighborIds.length) return null;

  const neighborPositions: GraphPositionMap = {};
  const neighborSizes: GraphSizeMap = {};

  neighborIds.forEach((id) => {
    neighborPositions[id] = positions[id] ?? { x: 0, y: 0 };
    neighborSizes[id] = getSize(id) ?? { width: 320, height: 160 };
  });

  const fit = computeFitTransform(neighborPositions, neighborSizes, width, height);
  return { ...fit, scale: Math.min(fit.scale, 0.85) };
}
