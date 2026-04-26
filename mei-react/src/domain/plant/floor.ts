import type { PendingMachine } from '../../types/store';
import type { FloorConfig, FloorLine, FloorMachine } from '../../types/floor';

export function flattenFloorMachines(floorConfig: FloorConfig | null): FloorMachine[] {
  return floorConfig?.lines.flatMap((line) => line.machines) ?? [];
}

export function buildEntityToFloorMachine(machines: FloorMachine[]) {
  return Object.fromEntries(
    machines.filter((machine) => machine.entityId).map((machine) => [machine.entityId!, machine])
  ) as Record<string, FloorMachine>;
}

export function buildLiveEntityStates(machines: FloorMachine[]) {
  return Object.fromEntries(
    machines.filter((machine) => machine.entityId).map((machine) => [machine.entityId!, machine.state])
  ) as Record<string, string>;
}

export function getFloorStateLabel(floorConfig: FloorConfig | null, state: string) {
  const configured = floorConfig?.projection.stateLabels[state];
  if (configured) return configured;
  return state.replace(/_/g, ' ').toUpperCase();
}

export function resolveFloorLine(floorConfig: FloorConfig | null, lineRef?: string): FloorLine | null {
  const lines = floorConfig?.lines ?? [];
  if (lines.length === 0) return null;
  if (lineRef) {
    const match = lines.find((line) => line.id === lineRef || line.label === lineRef);
    if (match) return match;
  }
  const defaultLineRef = floorConfig?.projection.pendingPlacement.defaultLineRef;
  if (defaultLineRef) {
    const fallback = lines.find((line) => line.id === defaultLineRef || line.label === defaultLineRef);
    if (fallback) return fallback;
  }
  return lines[0];
}

export function resolveStarvedIds(floorConfig: FloorConfig | null, offlineIds: Set<string>) {
  const result = new Set<string>();
  (floorConfig?.lines ?? []).forEach((line) => {
    line.order.forEach((id, idx) => {
      if (!offlineIds.has(id)) return;
      for (let i = idx + 1; i < line.order.length; i++) result.add(line.order[i]);
    });
  });
  return result;
}

export function applyFloorMachineState(
  floorConfig: FloorConfig | null,
  machine: FloorMachine,
  currentEntityStates: Record<string, string>,
  offlineIds: Set<string>,
  starvedIds: Set<string>
): FloorMachine {
  if (offlineIds.has(machine.id)) {
    return { ...machine, state: 'offline', stateLabel: getFloorStateLabel(floorConfig, 'offline') };
  }
  if (starvedIds.has(machine.id)) {
    return { ...machine, state: 'starved', stateLabel: getFloorStateLabel(floorConfig, 'starved') };
  }
  if (!machine.entityId) return machine;
  const next = currentEntityStates[machine.entityId];
  if (!next || next === machine.state) return machine;
  return { ...machine, state: next, stateLabel: getFloorStateLabel(floorConfig, next) };
}

export function projectPendingFloorEquipment(
  floorConfig: FloorConfig | null,
  pendingMachines: PendingMachine[]
): FloorMachine[] {
  const projection = floorConfig?.projection;
  const pendingPlacement = projection?.pendingPlacement;
  const componentDims = projection?.componentDims ?? {};
  const defaultDims = projection?.defaultDims ?? { w: 1.4, h: 1.2, d: 1.2 };
  const defaultComponentClass = pendingPlacement?.defaultComponentClass ?? 'BlisterMachine';
  const defaultColor = pendingPlacement?.defaultColor ?? 'g1';
  const defaultState = pendingPlacement?.defaultState ?? 'pending';
  const baseX = pendingPlacement?.baseX ?? 8.2;
  const xStep = pendingPlacement?.xStep ?? 2.4;
  const laneCounts = new Map<string, number>();

  return pendingMachines.map((machine) => {
    const compClass = (machine.componentClass as string | undefined) || (machine.type as string | undefined) || defaultComponentClass;
    const dims = componentDims[compClass] ?? defaultDims;
    const line = resolveFloorLine(floorConfig, machine.line as string | undefined);
    const laneKey = line?.id ?? '__default__';
    const idx = laneCounts.get(laneKey) ?? 0;
    laneCounts.set(laneKey, idx + 1);
    const state = defaultState;

    return {
      id: String(machine.id ?? '').toLowerCase().replace(/-/g, '_') + '_pending',
      label: String(machine.id ?? ''),
      type: compClass,
      componentClass: compClass,
      state,
      stateLabel: getFloorStateLabel(floorConfig, state),
      color: defaultColor,
      lineTheme: line?.lineTheme,
      x: baseX + idx * xStep,
      z: line?.lz ?? 0,
      metrics: [],
      ...dims,
    } as FloorMachine;
  });
}

export function buildOfflineFloorAlarms(machines: FloorMachine[]) {
  return machines
    .filter((machine) => machine.state === 'offline')
    .map((machine) => ({
      id: machine.id,
      label: machine.label,
      severity: 'offline',
      msg: `Offline · ${machine.type}`,
    }));
}

export function buildOfflineXRangesPerLine(
  floorConfig: FloorConfig | null,
  applyState: (machine: FloorMachine) => FloorMachine
) {
  return (floorConfig?.lines ?? []).map((line) =>
    line.machines
      .filter((machine) => applyState(machine).state === 'offline')
      .map((machine) => [machine.x - machine.w / 2 - 0.15, machine.x + machine.w / 2 + 0.15] as [number, number])
  );
}
