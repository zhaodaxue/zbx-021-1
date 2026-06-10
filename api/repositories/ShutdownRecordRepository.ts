import { getDb, getQuery, allQuery, runQuery } from '../db/index.js';
import { ShutdownRecord } from '../../shared/types.js';

export class ShutdownRecordRepository {
  private async getDb() {
    return getDb();
  }

  async create(record: Omit<ShutdownRecord, 'id'>): Promise<number> {
    const db = await this.getDb();
    const result = await runQuery(db, `
      INSERT INTO shutdown_records (gun_id, shutdown_at, defrost_confirmed_at, recovered_at, trigger_reason)
      VALUES (?, ?, ?, ?, ?)
    `, [
      record.gunId,
      record.shutdownAt,
      record.defrostConfirmedAt || null,
      record.recoveredAt || null,
      record.triggerReason || null
    ]);
    return Number(result.lastID);
  }

  async findById(id: number): Promise<ShutdownRecord | null> {
    const db = await this.getDb();
    const row = await getQuery<any>(db, `
      SELECT * FROM shutdown_records WHERE id = ?
    `, [id]);

    if (!row) return null;

    return {
      id: row.id,
      gunId: row.gun_id,
      shutdownAt: row.shutdown_at,
      defrostConfirmedAt: row.defrost_confirmed_at,
      recoveredAt: row.recovered_at,
      triggerReason: row.trigger_reason,
    };
  }

  async findByGunId(gunId: string): Promise<ShutdownRecord[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT * FROM shutdown_records 
      WHERE gun_id = ? 
      ORDER BY shutdown_at DESC
    `, [gunId]);

    return rows.map(row => ({
      id: row.id,
      gunId: row.gun_id,
      shutdownAt: row.shutdown_at,
      defrostConfirmedAt: row.defrost_confirmed_at,
      recoveredAt: row.recovered_at,
      triggerReason: row.trigger_reason,
    }));
  }

  async findActiveByGunId(gunId: string): Promise<ShutdownRecord | null> {
    const db = await this.getDb();
    const row = await getQuery<any>(db, `
      SELECT * FROM shutdown_records 
      WHERE gun_id = ? AND recovered_at IS NULL
      ORDER BY shutdown_at DESC
      LIMIT 1
    `, [gunId]);

    if (!row) return null;

    return {
      id: row.id,
      gunId: row.gun_id,
      shutdownAt: row.shutdown_at,
      defrostConfirmedAt: row.defrost_confirmed_at,
      recoveredAt: row.recovered_at,
      triggerReason: row.trigger_reason,
    };
  }

  async findDefrostRequired(): Promise<(ShutdownRecord & { slope: string; minWaterPressure: number; status: string })[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT sr.*, sg.slope, sg.min_water_pressure, sg.status
      FROM shutdown_records sr
      JOIN snow_guns sg ON sr.gun_id = sg.id
      WHERE sr.defrost_confirmed_at IS NULL
        AND sr.recovered_at IS NULL
        AND sg.status = 'defrost_required'
      ORDER BY sr.shutdown_at DESC
    `);

    return rows.map(row => ({
      id: row.id,
      gunId: row.gun_id,
      shutdownAt: row.shutdown_at,
      defrostConfirmedAt: row.defrost_confirmed_at,
      recoveredAt: row.recovered_at,
      triggerReason: row.trigger_reason,
      slope: row.slope,
      minWaterPressure: row.min_water_pressure,
      status: row.status,
    }));
  }

  async findRecoveryRequired(): Promise<(ShutdownRecord & { slope: string; minWaterPressure: number; status: string })[]> {
    const db = await this.getDb();
    const rows = await allQuery<any>(db, `
      SELECT sr.*, sg.slope, sg.min_water_pressure, sg.status
      FROM shutdown_records sr
      JOIN snow_guns sg ON sr.gun_id = sg.id
      WHERE sr.defrost_confirmed_at IS NOT NULL
        AND sr.recovered_at IS NULL
        AND sg.status = 'defrost_completed'
      ORDER BY sr.defrost_confirmed_at ASC
    `);

    return rows.map(row => ({
      id: row.id,
      gunId: row.gun_id,
      shutdownAt: row.shutdown_at,
      defrostConfirmedAt: row.defrost_confirmed_at,
      recoveredAt: row.recovered_at,
      triggerReason: row.trigger_reason,
      slope: row.slope,
      minWaterPressure: row.min_water_pressure,
      status: row.status,
    }));
  }

  async confirmDefrost(id: number, confirmedAt: string): Promise<void> {
    const db = await this.getDb();
    await runQuery(db, `
      UPDATE shutdown_records SET defrost_confirmed_at = ? WHERE id = ?
    `, [confirmedAt, id]);
  }

  async confirmRecovery(id: number, recoveredAt: string): Promise<void> {
    const db = await this.getDb();
    await runQuery(db, `
      UPDATE shutdown_records SET recovered_at = ? WHERE id = ?
    `, [recoveredAt, id]);
  }
}
