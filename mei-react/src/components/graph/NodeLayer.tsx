import type { MotionValue } from 'framer-motion';
import { NodeCard } from './NodeCard';
import type { Entity, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

interface NodeLayerProps {
  entities: Entity[];
  positions: Record<string, Position>;
  sizes?: Record<string, { width?: number; height?: number }>;
  visibleIds: Set<string>;
  focusId: string | null;
  simulatedTime: number | null;
  onNodeClick?: (id: string) => void;
  onNodeDragEnd?: (id: string, x: number, y: number) => void;
  onNodeDrag?: (id: string, x: number, y: number) => void;
  onRegister?: (id: string, mx: MotionValue<number>, my: MotionValue<number>) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  zoneMap?: Record<string, ZoneId>;
}

export function NodeLayer({
  entities, positions, sizes, visibleIds, focusId, simulatedTime,
  onNodeClick, onNodeDragEnd, onNodeDrag, onRegister, onSizeChange,
  zoneMap,
}: NodeLayerProps) {
  return (
    <>
      {entities.map((entity) => {
        const inNeighbourhood = visibleIds.has(entity.id);
        const isFocused = focusId === entity.id;
        const isFocal   = focusId !== null && inNeighbourhood && !isFocused;
        const isDimmed  = focusId !== null && !inNeighbourhood;

        return (
          <NodeCard
            key={entity.id}
            entity={entity}
            position={positions[entity.id] ?? { x: 0, y: 0 }}
            size={sizes?.[entity.id]}
            isFocused={isFocused}
            isFocal={isFocal}
            isDimmed={isDimmed}
            simulatedTime={simulatedTime}
            zone={zoneMap?.[entity.id]}
            onClick={onNodeClick}
            onDragEnd={onNodeDragEnd}
            onDrag={onNodeDrag}
            onRegister={onRegister}
            onSizeChange={onSizeChange}
          />
        );
      })}
    </>
  );
}
