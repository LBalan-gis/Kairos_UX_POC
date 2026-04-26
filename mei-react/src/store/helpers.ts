import type { Entity, Relation } from '../types/domain';

export function buildEntityMap(entities: Entity[]): Record<string, Entity> {
  return Object.fromEntries(entities.map((entity) => [entity.id, entity]));
}

export function getNeighborhood(entityId: string, entities: Entity[], relations: Relation[]) {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const nodeIds = new Set<string>([entityId]);
  const edgeIds = new Set<string>();

  let frontierUp = [entityId];
  for (let depth = 0; depth < 3; depth++) {
    const next: string[] = [];
    frontierUp.forEach((id) => {
      relations.forEach((relation) => {
        if (relation.to === id && entityIds.has(relation.from) && entityIds.has(relation.to)) {
          nodeIds.add(relation.from);
          nodeIds.add(relation.to);
          edgeIds.add(relation.id);
          next.push(relation.from);
        }
      });
    });
    frontierUp = next;
    if (!frontierUp.length) break;
  }

  let frontierDown = [entityId];
  for (let depth = 0; depth < 4; depth++) {
    const next: string[] = [];
    frontierDown.forEach((id) => {
      relations.forEach((relation) => {
        if (relation.from === id && entityIds.has(relation.from) && entityIds.has(relation.to)) {
          nodeIds.add(relation.from);
          nodeIds.add(relation.to);
          edgeIds.add(relation.id);
          next.push(relation.to);
        }
      });
    });
    frontierDown = next;
    if (!frontierDown.length) break;
  }

  return { nodeIds, edgeIds };
}
