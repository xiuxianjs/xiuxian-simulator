import { getNotificationBackendConfig } from "../api/bot/config.js";
import { NotificationReceiptLookupUnavailableError, isRetryableNotificationRequestError } from "../api/bot/notification-error.js";
import { withReceiptDatabase } from "./receiptDatabase.js";
import { readPlatformDeliveryReceipt, storePlatformDeliveryReceipt } from "../api/bot/notification-cache.js";
import { logger } from "alemonjs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

//#region src/notification/deliveryReceipt.ts
const retentionMs = 6048e5;
/** Retain known outcomes across a restart, including when Redis and event confirmation both fail. */
function notificationDeliveryReceipt(eventId) {
	const scope = getNotificationBackendConfig().notificationQueueScope;
	const id = createHash("sha256").update(JSON.stringify([scope, eventId])).digest("hex");
	const path = resolve("data/notification-delivery/receipts.sqlite");
	return {
		async read() {
			let localError;
			try {
				const row = withReceiptDatabase(path, (db) => db.prepare("SELECT body FROM delivery_receipts WHERE id = ? AND expires_at > ?").get(id, Date.now()));
				if (typeof row?.body === "string") return JSON.parse(row.body);
			} catch (error) {
				localError = error;
				logger.error("本地通知回执读取失败，查询服务端回执", error);
			}
			const remote = await readPlatformDeliveryReceipt(eventId).catch((error) => {
				if (error instanceof Error && isRetryableNotificationRequestError(error)) throw new NotificationReceiptLookupUnavailableError(error.message, { cause: error });
				throw error;
			});
			if (!remote && localError !== void 0) throw new NotificationReceiptLookupUnavailableError("无法读取本地通知回执", { cause: localError });
			return remote;
		},
		async save(delivery) {
			let savedLocally = false;
			try {
				const now = Date.now();
				withReceiptDatabase(path, (db) => {
					db.prepare(`
            INSERT INTO delivery_receipts(id, body, expires_at) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at
            WHERE delivery_receipts.expires_at <= ?
          `).run(id, JSON.stringify(delivery), now + retentionMs, now);
					savedLocally = true;
					db.prepare("DELETE FROM delivery_receipts WHERE id IN (SELECT id FROM delivery_receipts WHERE expires_at <= ? LIMIT 128)").run(now);
				});
			} catch (error) {
				logger.error("本地通知回执保存失败，继续写入服务端回执", error);
			}
			if (getNotificationBackendConfig().notificationQueueScope !== scope) throw new Error("通知后端归属已变化，保留原通知回执");
			try {
				await storePlatformDeliveryReceipt(eventId, delivery);
			} catch (error) {
				if (!savedLocally) throw error;
				logger.error("服务端通知回执保存失败，本机已保存投递结果", error);
			}
		}
	};
}

//#endregion
export { notificationDeliveryReceipt };