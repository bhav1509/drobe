// src/db/index.ts
import * as SQLite from "expo-sqlite";

// Singleton: open the DB once (new API in expo-sqlite v15+)
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("drobe.db");
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT,
      silhouettePath TEXT NOT NULL,
      originalPath TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      bodyPath TEXT,
      updatedAt TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Thin async wrappers so the rest of the app can keep calling ...Async()
export const db = {
  async runAsync(sql: string, params: any[] = []) {
    const d = await getDb();
    return params.length ? d.runAsync(sql, ...params) : d.runAsync(sql);
  },
  async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const d = await getDb();
    return params.length
      ? d.getAllAsync<T>(sql, ...params)
      : d.getAllAsync<T>(sql);
  },
  async getFirstAsync<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    const d = await getDb();
    const row = params.length
      ? await d.getFirstAsync<T>(sql, ...params)
      : await d.getFirstAsync<T>(sql);
    return row ?? null;
  },
  async execAsync(batchSql: string) {
    const d = await getDb();
    return d.execAsync(batchSql);
  },
};
