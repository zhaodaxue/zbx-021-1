import { Request, Response } from 'express';
import { SnowGunRepository } from '../repositories/SnowGunRepository.js';
import { SensorRecordRepository } from '../repositories/SensorRecordRepository.js';
import { ShutdownRecordRepository } from '../repositories/ShutdownRecordRepository.js';
import { SensorService } from '../services/SensorService.js';

export class GunController {
  private snowGunRepo: SnowGunRepository;
  private sensorRepo: SensorRecordRepository;
  private shutdownRepo: ShutdownRecordRepository;
  private sensorService: SensorService;

  constructor() {
    this.snowGunRepo = new SnowGunRepository();
    this.sensorRepo = new SensorRecordRepository();
    this.shutdownRepo = new ShutdownRecordRepository();
    this.sensorService = new SensorService();
  }

  async getAllGuns(req: Request, res: Response): Promise<void> {
    try {
      const guns = await this.snowGunRepo.findAll();
      const slopes = await this.snowGunRepo.getSlopes();
      
      const grouped = slopes.map(slope => ({
        slope,
        guns: guns.filter(g => g.slope === slope),
      }));

      res.json({ success: true, data: grouped });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async getGunById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const gun = await this.snowGunRepo.findById(id);
      
      if (!gun) {
        res.status(404).json({ success: false, message: `造雪枪 ${id} 不存在` });
        return;
      }

      res.json({ success: true, data: gun });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async getSensorRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const hours = Number(req.query.hours) || 2;

      const gun = await this.snowGunRepo.findById(id);
      if (!gun) {
        res.status(404).json({ success: false, message: `造雪枪 ${id} 不存在` });
        return;
      }

      const records = await this.sensorService.getSensorRecords(id, hours);
      res.json({ success: true, data: records, minPressure: gun.minWaterPressure });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async getShutdownRecords(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const gun = await this.snowGunRepo.findById(id);
      if (!gun) {
        res.status(404).json({ success: false, message: `造雪枪 ${id} 不存在` });
        return;
      }

      const records = await this.shutdownRepo.findByGunId(id);
      res.json({ success: true, data: records });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async reportSensorData(req: Request, res: Response): Promise<void> {
    try {
      const { gunId, waterPressure, frostLevel } = req.body;

      if (!gunId || waterPressure === undefined || frostLevel === undefined) {
        res.status(400).json({ success: false, message: '缺少必要参数' });
        return;
      }

      const result = await this.sensorService.reportSensorData({
        gunId,
        waterPressure: Number(waterPressure),
        frostLevel: Number(frostLevel),
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }
}
