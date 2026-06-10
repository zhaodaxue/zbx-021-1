import { SlopeGroup } from '../api/client';
import { SnowGun, DefrostTodoItem, RecoveryTodoItem } from '../../shared/types.js';
import { ApiResponse } from '../api/client';

export function makeGun(overrides: Partial<SnowGun> & { id: string }): SnowGun {
  return {
    slope: 'A坡',
    minWaterPressure: 10,
    status: 'normal',
    currentWaterPressure: 15,
    currentFrostLevel: 0,
    currentRecordedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeSlopeGroups(guns: SnowGun[]): SlopeGroup[] {
  const groups: Record<string, SnowGun[]> = {};
  for (const gun of guns) {
    const slope = gun.slope;
    if (!groups[slope]) groups[slope] = [];
    groups[slope].push(gun);
  }
  return Object.entries(groups).map(([slope, g]) => ({ slope, guns: g }));
}

export function makeDefrostTodo(overrides: Partial<DefrostTodoItem> & { id: string; shutdownId: number }): DefrostTodoItem {
  return {
    slope: 'A坡',
    minWaterPressure: 10,
    status: 'defrost_required',
    shutdownAt: new Date().toISOString(),
    triggerReason: '结霜等级过高',
    ...overrides,
  };
}

export function makeRecoveryTodo(overrides: Partial<RecoveryTodoItem> & { id: string; shutdownId: number }): RecoveryTodoItem {
  return {
    slope: 'A坡',
    minWaterPressure: 10,
    status: 'defrost_completed',
    shutdownAt: new Date().toISOString(),
    defrostConfirmedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function gunsResponse(guns: SnowGun[]): ApiResponse<SlopeGroup[]> {
  return { success: true, data: makeSlopeGroups(guns) };
}

export function defrostResponse(todos: DefrostTodoItem[]): ApiResponse<DefrostTodoItem[]> {
  return { success: true, data: todos };
}

export function recoveryResponse(todos: RecoveryTodoItem[]): ApiResponse<RecoveryTodoItem[]> {
  return { success: true, data: todos };
}

export function resetStoreState() {
  const { useAppStore } = require('../store/useAppStore');
  useAppStore.setState({
    slopeGroups: [],
    defrostTodos: [],
    recoveryTodos: [],
    loading: false,
    error: null,
    lastUpdate: 0,
    newAlerts: [],
    acknowledgedShutdownIds: new Set(),
    alertsCollapsed: false,
    highlightedGunId: null,
    dismissedDetailGunIds: new Set(),
    prevStatusMap: new Map(),
    prevFetchSuccess: false,
  });
}
