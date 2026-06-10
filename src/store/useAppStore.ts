import { create } from 'zustand';
import { api, SlopeGroup } from '../api/client';
import { SnowGun, DefrostTodoItem, RecoveryTodoItem } from '../../shared/types.js';

const ACKNOWLEDGED_KEY = 'defrost_alerts_acknowledged';
const ALERTS_COLLAPSED_KEY = 'defrost_alerts_collapsed';

export interface AlertItem {
  gunId: string;
  slope: string;
  shutdownId: number;
  shutdownAt: string;
  triggerReason: string;
}

interface AlertState {
  newAlerts: AlertItem[];
  acknowledgedShutdownIds: Set<number>;
  alertsCollapsed: boolean;
  highlightedGunId: string | null;
  dismissedDetailGunIds: Set<string>;
  prevStatusMap: Map<string, string>;
  prevFetchSuccess: boolean;

  acknowledgeAlert: (shutdownId: number) => void;
  acknowledgeAllAlerts: () => void;
  setAlertsCollapsed: (collapsed: boolean) => void;
  setHighlightedGun: (gunId: string | null) => void;
  dismissDetailAlert: (gunId: string) => void;
  clearDismissedDetailAlert: (gunId: string) => void;
}

interface AppState extends AlertState {
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

function loadAcknowledged(): Set<number> {
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_KEY);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveAcknowledged(set: Set<number>) {
  try {
    localStorage.setItem(ACKNOWLEDGED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(ALERTS_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(ALERTS_COLLAPSED_KEY, String(collapsed));
  } catch {
    // ignore
  }
}

function buildStatusMap(slopeGroups: SlopeGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of slopeGroups) {
    for (const gun of group.guns) {
      map.set(gun.id, gun.status);
    }
  }
  return map;
}

function findDefrostTodo(
  defrostTodos: DefrostTodoItem[],
  gunId: string
): DefrostTodoItem | undefined {
  return defrostTodos.find(t => t.id === gunId);
}

export const useAppStore = create<AppState>((set, get) => ({
  slopeGroups: [],
  defrostTodos: [],
  recoveryTodos: [],
  loading: false,
  error: null,
  lastUpdate: 0,

  newAlerts: [],
  acknowledgedShutdownIds: loadAcknowledged(),
  alertsCollapsed: loadCollapsed(),
  highlightedGunId: null,
  dismissedDetailGunIds: new Set(),
  prevStatusMap: new Map(),
  prevFetchSuccess: false,

  fetchAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [gunsResponse, defrostResponse, recoveryResponse] = await Promise.all([
        api.getAllGuns(),
        api.getDefrostTodos(),
        api.getRecoveryTodos(),
      ]);

      const newSlopeGroups = gunsResponse.data;
      const newDefrostTodos = defrostResponse.data;
      const newRecoveryTodos = recoveryResponse.data;

      const { prevStatusMap, prevFetchSuccess, acknowledgedShutdownIds, highlightedGunId } = get();

      let newHighlightedGunId = highlightedGunId;

      if (prevFetchSuccess && prevStatusMap.size > 0) {
        const newAlerts: AlertItem[] = [];
        const currentStatusMap = buildStatusMap(newSlopeGroups);

        for (const [gunId, prevStatus] of prevStatusMap) {
          const currStatus = currentStatusMap.get(gunId);
          if (
            prevStatus !== 'defrost_required' &&
            currStatus === 'defrost_required'
          ) {
            const todo = findDefrostTodo(newDefrostTodos, gunId);
            if (todo) {
              if (!acknowledgedShutdownIds.has(todo.shutdownId)) {
                newAlerts.push({
                  gunId: todo.id,
                  slope: todo.slope,
                  shutdownId: todo.shutdownId,
                  shutdownAt: todo.shutdownAt,
                  triggerReason: todo.triggerReason,
                });
              }
            }
          }
        }

        if (highlightedGunId) {
          const highlightedGun = newSlopeGroups
            .flatMap(g => g.guns)
            .find(g => g.id === highlightedGunId);
          if (!highlightedGun || highlightedGun.status !== 'defrost_required') {
            newHighlightedGunId = null;
          }
        }

        const prevAlertGunIds = new Set(get().newAlerts.map(a => a.gunId));
        const stillDefrostGunIds = new Set(
          newDefrostTodos.map(t => t.id)
        );

        const existingAlerts = get().newAlerts.filter(
          a => stillDefrostGunIds.has(a.gunId) && !acknowledgedShutdownIds.has(a.shutdownId)
        );

        const freshNewAlerts = newAlerts.filter(
          a => !prevAlertGunIds.has(a.gunId)
        );

        const cleanedAcknowledged = new Set(
          Array.from(acknowledgedShutdownIds).filter(id =>
            newDefrostTodos.some(t => t.shutdownId === id)
          )
        );
        if (cleanedAcknowledged.size !== acknowledgedShutdownIds.size) {
          saveAcknowledged(cleanedAcknowledged);
        }

        const dismissedDetailGunIds = get().dismissedDetailGunIds;
        const cleanedDismissed = new Set(
          Array.from(dismissedDetailGunIds).filter(gunId => {
            const gun = newSlopeGroups.flatMap(g => g.guns).find(g => g.id === gunId);
            return gun && gun.status === 'defrost_required';
          })
        );

        set({
          newAlerts: [...existingAlerts, ...freshNewAlerts],
          acknowledgedShutdownIds: cleanedAcknowledged,
          dismissedDetailGunIds: cleanedDismissed,
          highlightedGunId: newHighlightedGunId,
        });
      }

      set({
        slopeGroups: newSlopeGroups,
        defrostTodos: newDefrostTodos,
        recoveryTodos: newRecoveryTodos,
        prevStatusMap: buildStatusMap(newSlopeGroups),
        prevFetchSuccess: true,
        lastUpdate: Date.now(),
      });
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
    const { defrostTodos, highlightedGunId } = get();
    const todo = defrostTodos.find(t => t.shutdownId === shutdownId);
    const gunId = todo?.id;

    const result = await api.confirmDefrost(shutdownId);
    await get().fetchAllData();

    const state = get();
    const newAcknowledged = new Set(state.acknowledgedShutdownIds);
    newAcknowledged.delete(shutdownId);
    saveAcknowledged(newAcknowledged);

    const newAlertsFiltered = state.newAlerts.filter(a => a.shutdownId !== shutdownId);

    const newHighlighted = gunId && highlightedGunId === gunId ? null : state.highlightedGunId;

    set({
      acknowledgedShutdownIds: newAcknowledged,
      newAlerts: newAlertsFiltered,
      highlightedGunId: newHighlighted,
    });

    return result;
  },

  confirmRecovery: async (shutdownId: number) => {
    const { recoveryTodos, highlightedGunId } = get();
    const todo = recoveryTodos.find(t => t.shutdownId === shutdownId);
    const gunId = todo?.id;

    const result = await api.confirmRecovery(shutdownId);
    await get().fetchAllData();

    const state = get();
    const newAcknowledged = new Set(state.acknowledgedShutdownIds);
    newAcknowledged.delete(shutdownId);
    saveAcknowledged(newAcknowledged);

    const newAlertsFiltered = state.newAlerts.filter(a => a.shutdownId !== shutdownId);

    const newHighlighted = gunId && highlightedGunId === gunId ? null : state.highlightedGunId;

    set({
      acknowledgedShutdownIds: newAcknowledged,
      newAlerts: newAlertsFiltered,
      highlightedGunId: newHighlighted,
    });

    return result;
  },

  reportSensorData: async (data: { gunId: string; waterPressure: number; frostLevel: number }) => {
    await api.reportSensorData(data);
    await get().fetchAllData();
  },

  getGunById: (id: string) => {
    const { slopeGroups } = get();
    for (const group of slopeGroups) {
      const gun = group.guns.find(g => g.id === id);
      if (gun) return gun;
    }
    return undefined;
  },

  acknowledgeAlert: (shutdownId: number) => {
    const { acknowledgedShutdownIds, newAlerts } = get();
    const newAcknowledged = new Set(acknowledgedShutdownIds);
    newAcknowledged.add(shutdownId);
    saveAcknowledged(newAcknowledged);

    const newAlertsFiltered = newAlerts.filter(a => a.shutdownId !== shutdownId);

    set({
      acknowledgedShutdownIds: newAcknowledged,
      newAlerts: newAlertsFiltered,
    });
  },

  acknowledgeAllAlerts: () => {
    const { acknowledgedShutdownIds, newAlerts } = get();
    const newAcknowledged = new Set(acknowledgedShutdownIds);
    for (const alert of newAlerts) {
      newAcknowledged.add(alert.shutdownId);
    }
    saveAcknowledged(newAcknowledged);

    set({
      acknowledgedShutdownIds: newAcknowledged,
      newAlerts: [],
    });
  },

  setAlertsCollapsed: (collapsed: boolean) => {
    saveCollapsed(collapsed);
    set({ alertsCollapsed: collapsed });
  },

  setHighlightedGun: (gunId: string | null) => {
    set({ highlightedGunId: gunId });
  },

  dismissDetailAlert: (gunId: string) => {
    const { dismissedDetailGunIds } = get();
    const newDismissed = new Set(dismissedDetailGunIds);
    newDismissed.add(gunId);
    set({ dismissedDetailGunIds: newDismissed });
  },

  clearDismissedDetailAlert: (gunId: string) => {
    const { dismissedDetailGunIds } = get();
    const newDismissed = new Set(dismissedDetailGunIds);
    newDismissed.delete(gunId);
    set({ dismissedDetailGunIds: newDismissed });
  },
}));
