import type { FloorConfig, FloorMachine } from '../../types/floor';
import type { FloorWidgetAnchor } from '../../types/widgets';

function toAnchor(machine: FloorMachine): FloorWidgetAnchor {
  return {
    id: machine.id,
    entityId: machine.entityId,
    x: machine.x,
    z: machine.z,
    h: machine.h,
  };
}

export function buildFloorWidgetAnchors(floorConfig: FloorConfig | null): FloorWidgetAnchor[] {
  if (!floorConfig) return [];
  return floorConfig.lines.flatMap((line) => line.machines.map(toAnchor));
}

export function resolveFloorWidgetAnchor(
  anchors: FloorWidgetAnchor[],
  entityId: string
): FloorWidgetAnchor | null {
  return anchors.find((anchor) => anchor.entityId === entityId || anchor.id === entityId) ?? null;
}
