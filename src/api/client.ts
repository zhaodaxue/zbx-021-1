import {
  SnowGun,
  SensorRecord,
  ShutdownRecord,
  DefrostTodoItem,
  RecoveryTodoItem,
  RuleCheckResult,
} from '../../shared/types.js';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export interface SlopeGroup {
  slope: string;
  guns: SnowGun[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  warning?: string;
}

export interface SensorRecordsResponse extends ApiResponse<SensorRecord[]> {
  minPressure: number;
}

export const api = {
  getAllGuns: () => request<ApiResponse<SlopeGroup[]>>('/guns'),

  getGunById: (id: string) => request<ApiResponse<SnowGun>>(`/guns/${id}`),

  getSensorRecords: (gunId: string, hours: number = 2) =>
    request<SensorRecordsResponse>(`/guns/${gunId}/sensor-records?hours=${hours}`),

  getShutdownRecords: (gunId: string) =>
    request<ApiResponse<ShutdownRecord[]>>(`/guns/${gunId}/shutdown-records`),

  reportSensorData: (data: { gunId: string; waterPressure: number; frostLevel: number }) =>
    request<{
      success: boolean;
      recordId: number;
      ruleCheck: RuleCheckResult;
    }>('/sensor-records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDefrostTodos: () => request<ApiResponse<DefrostTodoItem[]>>('/todo/defrost'),

  confirmDefrost: (shutdownId: number) =>
    request<{ success: boolean; message: string }>(`/todo/defrost/${shutdownId}/confirm`, {
      method: 'POST',
    }),

  getRecoveryTodos: () => request<ApiResponse<RecoveryTodoItem[]>>('/todo/recovery'),

  confirmRecovery: (shutdownId: number) =>
    request<{ success: boolean; message: string; warning?: string }>(
      `/todo/recovery/${shutdownId}/confirm`,
      {
        method: 'POST',
      }
    ),
};
