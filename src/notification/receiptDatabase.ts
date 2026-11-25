import { closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function withReceiptDatabase<T>(path: string, action: (db: DatabaseSync) => T): T {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  closeSync(openSync(path, 'a', 0o600));
  const db = new DatabaseSync(path);

  try {
    db.exec(`
      PRAGMA busy_timeout = 250;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS delivery_receipts (
        id TEXT PRIMARY KEY,
        body TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS delivery_receipts_expiry ON delivery_receipts(expires_at);
    `);

    return action(db);
  } finally {
    db.close();
  }
}
