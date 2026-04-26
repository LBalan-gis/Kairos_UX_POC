import { NodeCard } from './NodeCard';

export function NodeLayer({
  entities, positions, sizes, visibleIds, focusId, simulatedTime,
  onNodeClick, onNodeDragEnd, onNodeDrag, onRegister, onSizeChange,
}) {
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
