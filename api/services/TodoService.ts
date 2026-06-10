import { ShutdownRecordRepository } from '../repositories/ShutdownRecordRepository.js';
import { SnowGunRepository } from '../repositories/SnowGunRepository.js';
import { SensorRecordRepository } from '../repositories/SensorRecordRepository.js';
import { RuleEngine } from './RuleEngine.js';
import { DefrostTodoItem, RecoveryTodoItem, FrostLevel } from '../../shared/types.js';

export class TodoService {
  private shutdownRepo: ShutdownRecordRepository;
  private snowGunRepo: SnowGunRepository;
  private sensorRepo: SensorRecordRepository;
  private ruleEngine: RuleEngine;

  constructor() {
    this.shutdownRepo = new ShutdownRecordRepository();
    this.snowGunRepo = new SnowGunRepository();
    this.sensorRepo = new SensorRecordRepository();
    this.ruleEngine = new RuleEngine();
  }

  async getDefrostTodos(): Promise<DefrostTodoItem[]> {
    const shutdowns = await this.shutdownRepo.findDefrostRequired();

    const todos = await Promise.all(shutdowns.map(async s => {
      const latestRecord = await this.sensorRepo.findLatestByGunId(s.gunId);
      return {
        id: s.gunId,
        slope: s.slope,
        minWaterPressure: s.minWaterPressure,
        status: s.status as DefrostTodoItem['status'],
        currentWaterPressure: latestRecord?.waterPressure,
        currentFrostLevel: latestRecord?.frostLevel as FrostLevel,
        currentRecordedAt: latestRecord?.recordedAt,
        shutdownId: s.id!,
        shutdownAt: s.shutdownAt,
        triggerReason: s.triggerReason || '',
      };
    }));

    return todos;
  }

  async getRecoveryTodos(): Promise<RecoveryTodoItem[]> {
    const shutdowns = await this.shutdownRepo.findRecoveryRequired();

    const todos = await Promise.all(shutdowns.map(async s => {
      const latestRecord = await this.sensorRepo.findLatestByGunId(s.gunId);
      return {
        id: s.gunId,
        slope: s.slope,
        minWaterPressure: s.minWaterPressure,
        status: s.status as RecoveryTodoItem['status'],
        currentWaterPressure: latestRecord?.waterPressure,
        currentFrostLevel: latestRecord?.frostLevel as FrostLevel,
        currentRecordedAt: latestRecord?.recordedAt,
        shutdownId: s.id!,
        shutdownAt: s.shutdownAt,
        defrostConfirmedAt: s.defrostConfirmedAt!,
      };
    }));

    return todos;
  }

  async confirmDefrost(shutdownId: number): Promise<{ success: boolean; message: string }> {
    const shutdown = await this.shutdownRepo.findById(shutdownId);
    if (!shutdown) {
      throw new Error(`停机记录 ${shutdownId} 不存在`);
    }

    if (shutdown.defrostConfirmedAt) {
      throw new Error('该停机记录已确认融霜完成');
    }

    await this.shutdownRepo.confirmDefrost(shutdownId, new Date().toISOString());
    await this.snowGunRepo.updateStatus(shutdown.gunId, 'defrost_completed');

    return {
      success: true,
      message: '融霜完成已确认，等待恢复运行登记',
    };
  }

  async confirmRecovery(shutdownId: number): Promise<{
    success: boolean;
    message: string;
    warning?: string;
  }> {
    const shutdown = await this.shutdownRepo.findById(shutdownId);
    if (!shutdown) {
      throw new Error(`停机记录 ${shutdownId} 不存在`);
    }

    if (shutdown.recoveredAt) {
      throw new Error('该停机记录已恢复运行');
    }

    if (!shutdown.defrostConfirmedAt) {
      throw new Error('请先确认融霜完成');
    }

    const { canRecover, latestFrostLevel } = await this.ruleEngine.canRecover(shutdown.gunId);

    await this.shutdownRepo.confirmRecovery(shutdownId, new Date().toISOString());
    await this.snowGunRepo.updateStatus(shutdown.gunId, 'normal');

    if (!canRecover) {
      return {
        success: true,
        message: '恢复运行已登记',
        warning: `注意：当前结霜等级为 ${latestFrostLevel}，建议确认融霜效果`,
      };
    }

    return {
      success: true,
      message: '恢复运行已登记',
    };
  }
}
