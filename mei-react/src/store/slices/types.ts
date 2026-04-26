import type { StateCreator } from 'zustand';
import type { AppStore } from '../../types/store';

export type AppStateCreator = StateCreator<AppStore, [], [], Partial<AppStore>>;
