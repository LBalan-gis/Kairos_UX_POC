import { persist } from 'zustand/middleware';
import type { AppStore } from '../types/store';
import { initialState } from './initialState';
import { createDomainSlice } from './slices/domainSlice';
import { createSimulationSlice } from './slices/simulationSlice';
import { createUiSlice } from './slices/uiSlice';
import { createWhiteboardSlice } from './slices/whiteboardSlice';

const STORAGE_VERSION = 'v17';

export function createAppStore() {
  return persist<AppStore>(
    (set, get, api) => ({
      ...initialState,
      ...createDomainSlice(set, get, api),
      ...createWhiteboardSlice(set, get, api),
      ...createSimulationSlice(set, get, api),
      ...createUiSlice(set, get, api),
    }),
    {
      name: `kairos_state_${STORAGE_VERSION}`,
      partialize: (state) => ({ positions: state.positions, dark: state.dark }),
    }
  );
}
