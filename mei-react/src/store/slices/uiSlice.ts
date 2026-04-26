import type { AppStateCreator } from './types';

export const createUiSlice: AppStateCreator = (set) => ({
  toggleDark: () => set((state) => ({ dark: !state.dark })),
  openKairos: (kairosEntityId = null) => set({ kairosOpen: true, kairosEntityId }),
  closeKairos: () => set({ kairosOpen: false, kairosEntityId: null }),
  pinChart: (item) => set((state) => ({ pinnedCharts: [...state.pinnedCharts, item] })),
  unpinChart: (id) => set((state) => ({ pinnedCharts: state.pinnedCharts.filter((chart) => chart.id !== id) })),
  openOnboarding: () => set({ onboardingOpen: true }),
  closeOnboarding: () => set({ onboardingOpen: false }),
  addPendingMachine: (machine) => set((state) => ({ pendingMachines: [...state.pendingMachines, machine] })),
  setMachineOffline: (id) => set((state) => ({
    plant: { ...state.plant, offlineIds: new Set([...state.plant.offlineIds, id]) },
  })),
  setMachineOnline: (id) =>
    set((state) => {
      const offlineIds = new Set(state.plant.offlineIds);
      offlineIds.delete(id);
      return { plant: { ...state.plant, offlineIds } };
    }),
  clearOffline: () => set((state) => ({ plant: { ...state.plant, offlineIds: new Set() } })),
  addActionLog: (entry) => set((state) => ({ actionLog: [...state.actionLog.slice(-99), entry] })),
  clearActionLog: () => set({ actionLog: [] }),
  addSpatialWidget: (widget) =>
    set((state) => ({
      spatialWidgets: [...state.spatialWidgets.filter((entry) => entry.id !== widget.id), widget],
    })),
  removeSpatialWidget: (id) =>
    set((state) => ({ spatialWidgets: state.spatialWidgets.filter((widget) => widget.id !== id) })),
  clearSpatialWidgets: () => set({ spatialWidgets: [] }),
  bumpSignal: (ids) => {
    const now = Date.now();
    set((state) => ({
      plant: {
        ...state.plant,
        signalTimestamps: {
          ...state.plant.signalTimestamps,
          ...Object.fromEntries(ids.map((id) => [id, now])),
        },
      },
    }));
  },
});
