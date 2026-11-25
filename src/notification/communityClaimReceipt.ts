import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { withReceiptDatabase } from './receiptDatabase';

export type CommunityClaimRequest = { botId: string; consumer: string; requestId: string };

type StoredClaim = { ownerPID: number; request: CommunityClaimRequest };

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') { return false; }
    if ((error as NodeJS.ErrnoException).code === 'EPERM') { return true; }
    throw error;
  }
}

export function communityClaimReceipt(scope: string, botId: string) {
  const path = resolve('data/notification-delivery/receipts.sqlite');
  const id =
    'community-claim:' +
    createHash('sha256')
      .update(JSON.stringify([scope, botId]))
      .digest('hex');

  return {
    read(): CommunityClaimRequest | null | 'busy' {
      if (!existsSync(path)) { return null; }

      return withReceiptDatabase(path, db => {
        const now = Date.now();
        const row = db.prepare('SELECT body FROM delivery_receipts WHERE id = ? AND expires_at > ?').get(id, now);

        if (typeof row?.body !== 'string') { return null; }

        const stored = JSON.parse(row.body) as StoredClaim;

        if (!Number.isSafeInteger(stored.ownerPID) || stored.ownerPID <= 0 || stored.request?.botId !== botId) {
          throw new Error('本地群通知领取回执无效');
        }
        if (stored.ownerPID === process.pid) { return stored.request; }
        if (isRunning(stored.ownerPID)) { return 'busy'; }

        // Claim the abandoned local receipt before talking to Redis. A
        // concurrent process using the same workspace must not recover it too.
        const transferred = db
          .prepare('UPDATE delivery_receipts SET body = ? WHERE id = ? AND body = ? AND expires_at > ?')
          .run(JSON.stringify({ ...stored, ownerPID: process.pid }), id, row.body, now);

        return transferred.changes === 1 ? stored.request : 'busy';
      });
    },
    save(request: CommunityClaimRequest, expiresAt: number): void {
      withReceiptDatabase(path, db => {
        const now = Date.now();

        db.prepare(
          `
          INSERT INTO delivery_receipts(id, body, expires_at) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at
          WHERE delivery_receipts.expires_at <= ?
        `
        ).run(id, JSON.stringify({ ownerPID: process.pid, request }), expiresAt, now);
      });
    },
    clear(request: CommunityClaimRequest): void {
      withReceiptDatabase(path, db => {
        db.prepare('DELETE FROM delivery_receipts WHERE id = ? AND body = ?').run(id, JSON.stringify({ ownerPID: process.pid, request }));
      });
    }
  };
}
