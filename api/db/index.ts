import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(currentDir: string): string {
  const packageJsonPath = path.join(currentDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    return currentDir;
  }
  const parentDir = path.dirname(currentDir);
  if (parentDir === currentDir) {
    return currentDir;
  }
  return findProjectRoot(parentDir);
}

const projectRoot = findProjectRoot(__dirname);
const DB_DIR = process.env.DB_DIR || path.join(projectRoot, 'data');
const DB_PATH = path.join(DB_DIR, 'snowmaking.db');

let db: sqlite3.Database | null = null;

function ensureDirExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function getDb(): Promise<sqlite3.Database> {
  if (!db) {
    ensureDirExists(DB_DIR);
    db = new sqlite3.Database(DB_PATH);
    await initDb(db);
  }
  return db;
}

function initDb(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS snow_guns (
          id TEXT PRIMARY KEY,
          slope TEXT NOT NULL,
          min_water_pressure REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'normal'
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS sensor_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gun_id TEXT NOT NULL,
          recorded_at TEXT NOT NULL,
          water_pressure REAL NOT NULL,
          frost_level INTEGER NOT NULL CHECK (frost_level IN (0, 1, 2, 3)),
          FOREIGN KEY (gun_id) REFERENCES snow_guns(id)
        )
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_sensor_gun_time 
        ON sensor_records(gun_id, recorded_at DESC)
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS shutdown_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gun_id TEXT NOT NULL,
          shutdown_at TEXT NOT NULL,
          defrost_confirmed_at TEXT,
          recovered_at TEXT,
          trigger_reason TEXT,
          FOREIGN KEY (gun_id) REFERENCES snow_guns(id)
        )
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_shutdown_gun 
        ON shutdown_records(gun_id)
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_shutdown_recovered 
        ON shutdown_records(recovered_at)
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export function runQuery(
  db: sqlite3.Database,
  sql: string,
  params: any[] = []
): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err: Error | null) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery<T>(db: sqlite3.Database, sql: string, params: any[] = [] ): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function allQuery<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
