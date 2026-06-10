import { SensorRecordRepository } from '../repositories/SensorRecordRepository.js';
import { SnowGunRepository } from '../repositories/SnowGunRepository.js';
import { RuleEngine } from './RuleEngine.js';
import { SensorRecord, FrostLevel, RuleCheckResult } from '../../shared/types.js';

export class SensorService {
  private sensorRepo: SensorRecordRepository;
  private snowGunRepo: SnowGunRepository;
  private ruleEngine: RuleEngine;

  constructor() {
    this.sensorRepo = new SensorRecordRepository();
    this.snowGunRepo = new SnowGunRepository();
    this.ruleEngine = new RuleEngine();
  }

  async reportSensorData(data: {
    gunId: string;
    waterPressure: number;
    frostLevel: number;
  }): Promise<{
    success: boolean;
    recordId: number;
    ruleCheck: RuleCheckResult;
  }> {
    const gun = await this.snowGunRepo.findById(data.gunId);
    if (!gun) {
      throw new Error(`造雪枪 ${data.gunId} 不存在`);
    }

    if (data.frostLevel < 0 || data.frostLevel > 3 || !Number.isInteger(data.frostLevel)) {
      throw new Error('结霜等级必须是 0-3 的整数');
    }

    const record: Omit<SensorRecord, 'id'> = {
      gunId: data.gunId,
      recordedAt: new Date().toISOString(),
      waterPressure: data.waterPressure,
      frostLevel: data.frostLevel as FrostLevel,
    };

    const recordId = await this.sensorRepo.create(record);

    const ruleCheck = await this.ruleEngine.checkDefrostRule(data.gunId);

    return {
      success: true,
      recordId,
      ruleCheck,
    };
  }

  async getSensorRecords(gunId: string, hours: number = 2): Promise<SensorRecord[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.sensorRepo.findByGunIdSince(gunId, since);
  }
}
