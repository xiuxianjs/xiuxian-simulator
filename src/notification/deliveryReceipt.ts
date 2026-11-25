import { logger } from 'alemonjs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { withReceiptDatabase } from './receiptDatabase';
import { getNotificationBackendConfig } from '@src/api/bot/config';
import { readPlatformDeliveryReceipt, storePlatformDeliveryReceipt } from '@src/api/bot/notification-cache';
import { isRetryableNotificationRequestError, NotificationReceiptLookupUnavailableError } from '@src/api/bot/notification-error';
import type { NotificationDelivery } from '@src/types/notification';

const retentionMs = 7 * 24 * 60 * 60_000;

/** Retain known outcomes across a restart, including when Redis and event confirmation both fail. */
export function notificationDeliveryReceipt(eventId: string) {
  const scope = getNotificationBackendConfig().notificationQueueScope;
  const id = createHash('sha256')
    .update(JSON.stringify([scope, eventId]))
    .digest('hex');
  const path = resolve('data/notification-delivery/receipts.sqlite');

  return {
    async read(): Promise<NotificationDelivery | null> {
      let localError: unknown;

      try {
        const row = withReceiptDatabase(path, db => db.prepare('SELECT body FROM delivery_receipts WHERE id = ? AND expires_at > ?').get(id, Date.now()));

        if (typeof row?.body === 'string') {
          return JSON.parse(row.body) as NotificationDelivery;
        }
      } catch (error) {
        localError = error;
        logger.error('本地通知回执读取失败，查询服务端回执', error);
      }
      const remote = await readPlatformDeliveryReceipt(eventId).catch(error => {
        if (error instanceof Error && isRetryableNotificationRequestError(error)) {
          throw new NotificationReceiptLookupUnavailableError(error.message, { cause: error });
        }
        throw error;
      });

      if (!remote && localError !== undefined) {
        throw new NotificationReceiptLookupUnavailableError('无法读取本地通知回执', { cause: localError });
      }

      return remote;
    },
    async save(delivery: NotificationDelivery): Promise<void> {
      let savedLocally = false;

      try {
        const now = Date.now();

        withReceiptDatabase(path, db => {
          db.prepare(
            `
            INSERT INTO delivery_receipts(id, body, expires_at) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at
            WHERE delivery_receipts.expires_at <= ?
          `
          ).run(id, JSON.stringify(delivery), now + retentionMs, now);
          savedLocally = true;
          db.prepare('DELETE FROM delivery_receipts WHERE id IN (SELECT id FROM delivery_receipts WHERE expires_at <= ? LIMIT 128)').run(now);
        });
      } catch (error) {
        logger.error('本地通知回执保存失败，继续写入服务端回执', error);
      }
      if (getNotificationBackendConfig().notificationQueueScope !== scope) {
        throw new Error('通知后端归属已变化，保留原通知回执');
      }
      try {
        await storePlatformDeliveryReceipt(eventId, delivery);
      } catch (error) {
        if (!savedLocally) {
          throw error;
        }
        logger.error('服务端通知回执保存失败，本机已保存投递结果', error);
      }
    }
  };
}
