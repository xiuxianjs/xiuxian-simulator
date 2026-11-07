import { chmodSync, closeSync, mkdirSync, openSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type StoredBatch = {
  id: string;
  apiUrl: string;
  appid: string;
  body: string;
  count: number;
  attempts: number;
  retryAt: number;
  held: number;
};

const MiB = 1024 * 1024;

export const maxAnalyticsBatchBytes = 8 * MiB;

/** SQLite commits each batch before delivery. Only routing identity and payload are stored. */
export class AnalyticsOutbox {
  private readonly db: DatabaseSync;

  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, 'batches.sqlite');

    closeSync(openSync(path, 'a', 0o600));
    chmodSync(path, 0o600);
    this.db = new DatabaseSync(path);
    try {
      this.db.exec(`
        PRAGMA busy_timeout = 250;
        PRAGMA synchronous = FULL;
        PRAGMA secure_delete = ON;
        CREATE TABLE IF NOT EXISTS batches (
          id TEXT PRIMARY KEY, kind TEXT NOT NULL, apiUrl TEXT NOT NULL, appid TEXT NOT NULL,
          body TEXT NOT NULL, count INTEGER NOT NULL, bytes INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0, retryAt INTEGER NOT NULL DEFAULT 0, held INTEGER NOT NULL DEFAULT 0
        ) STRICT;
        CREATE INDEX IF NOT EXISTS batches_kind_app ON batches(kind, appid);
      `);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  put(kind: string, batch: StoredBatch): boolean {
    const bytes = Buffer.byteLength(batch.body);

    if (bytes > maxAnalyticsBatchBytes) {
      return false;
    }
    // Single write statement keeps admission atomic across processes.
    const result = this.db
      .prepare(
        `
      INSERT INTO batches (id, kind, apiUrl, appid, body, count, bytes)
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT count(*) FROM batches WHERE kind = ?) < 400
        AND (SELECT count(*) FROM batches WHERE kind = ? AND appid = ?) < 100
        AND (SELECT COALESCE(sum(bytes), 0) FROM batches WHERE appid = ?) + ? <= ?
        AND (SELECT COALESCE(sum(bytes), 0) FROM batches) + ? <= ?
    `
      )
      .run(batch.id, kind, batch.apiUrl, batch.appid, batch.body, batch.count, bytes, kind, kind, batch.appid, batch.appid, bytes, 16 * MiB, bytes, 64 * MiB);

    return result.changes === 1;
  }

  list(kind: string): StoredBatch[] {
    return this.db
      .prepare('SELECT id, apiUrl, appid, body, count, attempts, retryAt, held FROM batches WHERE kind = ? ORDER BY rowid')
      .all(kind) as StoredBatch[];
  }

  update(id: string, attempts: number, retryAt: number, held: number): void {
    this.db.prepare('UPDATE batches SET attempts = ?, retryAt = ?, held = ? WHERE id = ?').run(attempts, retryAt, held, id);
  }

  acknowledge(id: string): void {
    this.db.prepare('DELETE FROM batches WHERE id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}
