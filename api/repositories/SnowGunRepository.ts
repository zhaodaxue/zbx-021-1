import { getDb, getQuery, allQuery, runQuery } from '../db/index.js';
import { SnowGun, GunStatus } from '../../shared/types.js';

export class SnowGunRepository {
  private async getDb() {
    return getDb();
  }

  async findAll(): Promise<SnowGun[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT 
        sg.*,
        sr.water_pressure as current_water_pressure,
        sr.frost_level as current_frost_level,
        sr.recorded_at as current_recorded_at
      FROM snow_guns sg
      LEFT JOIN sensor_records sr ON sr.id = (
        SELECT id FROM sensor_records
        WHERE gun_id = sg.id
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
      )
      ORDER BY sg.slope, sg.id
    `);

    return rows.map(row => ({
      id: row.id,
      slope: row.slope,
      minWaterPressure: row.min_water_pressure,
      status: row.status as GunStatus,
      currentWaterPressure: row.current_water_pressure,
      currentFrostLevel: row.current_frost_level,
      currentRecordedAt: row.current_recorded_at,
    }));
  }

  async findById(id: string): Promise<SnowGun | null> {
    const db = await this.getDb();
    const row = await getQuery<any>(db, `
      SELECT 
        sg.*,
        sr.water_pressure as current_water_pressure,
        sr.frost_level as current_frost_level,
        sr.recorded_at as current_recorded_at
      FROM snow_guns sg
      LEFT JOIN sensor_records sr ON sr.id = (
        SELECT id FROM sensor_records
        WHERE gun_id = sg.id
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
      )
      WHERE sg.id = ?
    `, [id]);

    if (!row) return null;

    return {
      id: row.id,
      slope: row.slope,
      minWaterPressure: row.min_water_pressure,
      status: row.status as GunStatus,
      currentWaterPressure: row.current_water_pressure,
      currentFrostLevel: row.current_frost_level,
      currentRecordedAt: row.current_recorded_at,
    };
  }

  async findBySlope(slope: string): Promise<SnowGun[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT * FROM snow_guns WHERE slope = ? ORDER BY id
    `, [slope]);

    return rows.map((row: any) => ({
      id: row.id,
      slope: row.slope,
      minWaterPressure: row.min_water_pressure,
      status: row.status as GunStatus,
    }));
  }

  async updateStatus(id: string, status: GunStatus): Promise<void> {
    const db = await this.getDb();
    await runQuery(db, `
      UPDATE snow_guns SET status = ? WHERE id = ?
    `, [status, id]);
  }

  async create(gun: Omit<SnowGun, 'currentWaterPressure' | 'currentFrostLevel' | 'currentRecordedAt'>): Promise<void> {
    const db = await this.getDb();
    await runQuery(db, `
      INSERT OR IGNORE INTO snow_guns (id, slope, min_water_pressure, status)
      VALUES (?, ?, ?, ?)
    `, [gun.id, gun.slope, gun.minWaterPressure, gun.status]);
  }

  async getSlopes(): Promise<string[]> {
    const db = await this.getDb();
    const rows = await allQuery<{ slope: string }>(db, `
      SELECT DISTINCT slope FROM snow_guns ORDER BY slope
    `);
    return rows.map(r => r.slope);
  }
}
