import { SnowGunRepository } from '../repositories/SnowGunRepository.js';
import { SensorRecordRepository } from '../repositories/SensorRecordRepository.js';
import { ShutdownRecordRepository } from '../repositories/ShutdownRecordRepository.js';
import { RuleCheckResult, FrostLevel, ShutdownRecord } from '../../shared/types.js';

export class RuleEngine {
  private snowGunRepo: SnowGunRepository;
  private sensorRepo: SensorRecordRepository;
  private shutdownRepo: ShutdownRecordRepository;

  constructor() {
    this.snowGunRepo = new SnowGunRepository();
    this.sensorRepo = new SensorRecordRepository();
    this.shutdownRepo = new ShutdownRecordRepository();
  }

  async checkDefrostRule(gunId: string): Promise<RuleCheckResult> {
    const gun = await this.snowGunRepo.findById(gunId);
    if (!gun) {
      throw new Error(`造雪枪 ${gunId} 不存在`);
    }

    if (gun.status !== 'normal') {
      return {
        triggered: false,
        lowPressureCount: 0,
        latestFrostLevel: (gun.currentFrostLevel ?? 0) as FrostLevel,
      };
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentRecords = await this.sensorRepo.findByGunIdSince(gunId, tenMinutesAgo);

    if (recentRecords.length === 0) {
      return {
        triggered: false,
        lowPressureCount: 0,
        latestFrostLevel: 0,
      };
    }

    const lowPressureCount = recentRecords.filter(
      r => r.waterPressure < gun.minWaterPressure
    ).length;

    const latestRecord = recentRecords[recentRecords.length - 1];
    const latestFrostLevel = latestRecord.frostLevel;

    if (lowPressureCount >= 3 && latestFrostLevel >= 2) {
      const triggerReason = `10分钟内${lowPressureCount}次水压低于${gun.minWaterPressure}巴，当前结霜等级${latestFrostLevel}`;

      const existingShutdown = await this.shutdownRepo.findActiveByGunId(gunId);
      if (existingShutdown) {
        return {
          triggered: true,
          lowPressureCount,
          latestFrostLevel,
          shutdownRecord: existingShutdown,
        };
      }

      await this.snowGunRepo.updateStatus(gunId, 'defrost_required');

      const shutdownRecord: Omit<ShutdownRecord, 'id'> = {
        gunId,
        shutdownAt: new Date().toISOString(),
        triggerReason,
      };
      const shutdownId = await this.shutdownRepo.create(shutdownRecord);

      const createdRecord = await this.shutdownRepo.findById(shutdownId);

      return {
        triggered: true,
        lowPressureCount,
        latestFrostLevel,
        shutdownRecord: createdRecord || undefined,
      };
    }

    return {
      triggered: false,
      lowPressureCount,
      latestFrostLevel,
    };
  }

  async canRecover(gunId: string): Promise<{ canRecover: boolean; latestFrostLevel: FrostLevel }> {
    const latestRecord = await this.sensorRepo.findLatestByGunId(gunId);
    const latestFrostLevel = (latestRecord?.frostLevel ?? 0) as FrostLevel;
    return {
      canRecover: latestFrostLevel <= 1,
      latestFrostLevel,
    };
  }
}
