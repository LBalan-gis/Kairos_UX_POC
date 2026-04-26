import { create } from 'zustand';
import type { AppStore } from '../types/store';
import { createAppStore } from './createAppStore';

export const useAppStore = create<AppStore>()(createAppStore());
