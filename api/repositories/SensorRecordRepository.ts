import { getDb, getQuery, allQuery, runQuery } from '../db/index.js';
import { SensorRecord, FrostLevel } from '../../shared/types.js';

export class SensorRecordRepository {
  private async getDb() {
    return getDb();
  }

  async create(record: Omit<SensorRecord, 'id'>): Promise<number> {
    const db = await this.getDb();
    const result = await runQuery(db, `
      INSERT INTO sensor_records (gun_id, recorded_at, water_pressure, frost_level)
      VALUES (?, ?, ?, ?)
    `, [record.gunId, record.recordedAt, record.waterPressure, record.frostLevel]);
    return Number(result.lastID);
  }

  async findByGunId(gunId: string, limit: number = 100): Promise<SensorRecord[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT * FROM sensor_records 
      WHERE gun_id = ? 
      ORDER BY recorded_at DESC 
      LIMIT ?
    `, [gunId, limit]);

    return rows.map(row => ({
      id: row.id,
      gunId: row.gun_id,
      recordedAt: row.recorded_at,
      waterPressure: row.water_pressure,
      frostLevel: row.frost_level as FrostLevel,
    }));
  }

  async findByGunIdSince(gunId: string, since: string): Promise<SensorRecord[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT * FROM sensor_records 
      WHERE gun_id = ? AND recorded_at >= ?
      ORDER BY recorded_at ASC
    `, [gunId, since]);

    return rows.map(row => ({
      id: row.id,
      gunId: row.gun_id,
      recordedAt: row.recorded_at,
      waterPressure: row.water_pressure,
      frostLevel: row.frost_level as FrostLevel,
    }));
  }

  async findLatestByGunId(gunId: string): Promise<SensorRecord | null> {
    const db = await this.getDb();
    const row = await getQuery<any>(db, `
      SELECT * FROM sensor_records 
      WHERE gun_id = ? 
      ORDER BY recorded_at DESC 
      LIMIT 1
    `, [gunId]);

    if (!row) return null;

    return {
      id: row.id,
      gunId: row.gun_id,
      recordedAt: row.recorded_at,
      waterPressure: row.water_pressure,
      frostLevel: row.frost_level as FrostLevel,
    };
  }
}
