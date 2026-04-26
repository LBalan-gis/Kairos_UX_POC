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
  setMachineOffline: (id) => set((state) => ({ offlineIds: new Set([...state.offlineIds, id]) })),
  setMachineOnline: (id) =>
    set((state) => {
      const offlineIds = new Set(state.offlineIds);
      offlineIds.delete(id);
      return { offlineIds };
    }),
  clearOffline: () => set({ offlineIds: new Set() }),
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
      signalTimestamps: {
        ...state.signalTimestamps,
        ...Object.fromEntries(ids.map((id) => [id, now])),
      },
    }));
  },
});
