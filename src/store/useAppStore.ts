import { create } from 'zustand';
import { api, SlopeGroup } from '../api/client';
import { SnowGun, DefrostTodoItem, RecoveryTodoItem } from '../../shared/types.js';

interface AppState {
  slopeGroups: SlopeGroup[];
  defrostTodos: DefrostTodoItem[];
  recoveryTodos: RecoveryTodoItem[];
  loading: boolean;
  error: string | null;
  lastUpdate: number;

  fetchAllData: () => Promise<void>;
  fetchGuns: () => Promise<void>;
  fetchDefrostTodos: () => Promise<void>;
  fetchRecoveryTodos: () => Promise<void>;

  confirmDefrost: (shutdownId: number) => Promise<{ success: boolean; message: string }>;
  confirmRecovery: (shutdownId: number) => Promise<{ success: boolean; message: string; warning?: string }>;
  reportSensorData: (data: { gunId: string; waterPressure: number; frostLevel: number }) => Promise<void>;

  getGunById: (id: string) => SnowGun | undefined;
}

export const useAppStore = create<AppState>((set, get) => ({
  slopeGroups: [],
  defrostTodos: [],
  recoveryTodos: [],
  loading: false,
  error: null,
  lastUpdate: 0,

  fetchAllData: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchGuns(),
        get().fetchDefrostTodos(),
        get().fetchRecoveryTodos(),
      ]);
      set({ lastUpdate: Date.now() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchGuns: async () => {
    try {
      const response = await api.getAllGuns();
      set({ slopeGroups: response.data });
    } catch (error) {
      console.error('Failed to fetch guns:', error);
      throw error;
    }
  },

  fetchDefrostTodos: async () => {
    try {
      const response = await api.getDefrostTodos();
      set({ defrostTodos: response.data });
    } catch (error) {
      console.error('Failed to fetch defrost todos:', error);
      throw error;
    }
  },

  fetchRecoveryTodos: async () => {
    try {
      const response = await api.getRecoveryTodos();
      set({ recoveryTodos: response.data });
    } catch (error) {
      console.error('Failed to fetch recovery todos:', error);
      throw error;
    }
  },

  confirmDefrost: async (shutdownId: number) => {
    const result = await api.confirmDefrost(shutdownId);
    await Promise.all([get().fetchGuns(), get().fetchDefrostTodos(), get().fetchRecoveryTodos()]);
    return result;
  },

  confirmRecovery: async (shutdownId: number) => {
    const result = await api.confirmRecovery(shutdownId);
    await Promise.all([get().fetchGuns(), get().fetchDefrostTodos(), get().fetchRecoveryTodos()]);
    return result;
  },

  reportSensorData: async (data: { gunId: string; waterPressure: number; frostLevel: number }) => {
    await api.reportSensorData(data);
    await Promise.all([get().fetchGuns(), get().fetchDefrostTodos(), get().fetchRecoveryTodos()]);
  },

  getGunById: (id: string) => {
    const { slopeGroups } = get();
    for (const group of slopeGroups) {
      const gun = group.guns.find(g => g.id === id);
      if (gun) return gun;
    }
    return undefined;
  },
}));
