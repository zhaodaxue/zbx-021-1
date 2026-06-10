export type GunStatus = 'normal' | 'defrost_required' | 'defrost_completed';

export type FrostLevel = 0 | 1 | 2 | 3;

export interface SnowGun {
  id: string;
  slope: string;
  minWaterPressure: number;
  status: GunStatus;
  currentWaterPressure?: number;
  currentFrostLevel?: FrostLevel;
  currentRecordedAt?: string;
}

export interface SensorRecord {
  id?: number;
  gunId: string;
  recordedAt: string;
  waterPressure: number;
  frostLevel: FrostLevel;
}

export interface ShutdownRecord {
  id?: number;
  gunId: string;
  shutdownAt: string;
  defrostConfirmedAt?: string;
  recoveredAt?: string;
  triggerReason?: string;
}

export interface RuleCheckResult {
  triggered: boolean;
  lowPressureCount: number;
  latestFrostLevel: FrostLevel;
  shutdownRecord?: ShutdownRecord;
}

export interface DefrostTodoItem extends SnowGun {
  shutdownId: number;
  shutdownAt: string;
  triggerReason: string;
}

export interface RecoveryTodoItem extends SnowGun {
  shutdownId: number;
  shutdownAt: string;
  defrostConfirmedAt: string;
}

export const FROST_LEVEL_COLORS: Record<FrostLevel, string> = {
  0: '#00B42A',
  1: '#FF7D00',
  2: '#F53F3F',
  3: '#722ED1',
};

export const FROST_LEVEL_LABELS: Record<FrostLevel, string> = {
  0: '无结霜',
  1: '轻微结霜',
  2: '中度结霜',
  3: '严重结霜',
};

export const GUN_STATUS_LABELS: Record<GunStatus, string> = {
  normal: '正常运行',
  defrost_required: '需融霜',
  defrost_completed: '融霜完成待恢复',
};
