import { withReceiptDatabase } from "./receiptDatabase.js";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

//#region src/notification/communityClaimReceipt.ts
function isRunning(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		if (error.code === "ESRCH") return false;
		if (error.code === "EPERM") return true;
		throw error;
	}
}
function communityClaimReceipt(scope, botId) {
	const path = resolve("data/notification-delivery/receipts.sqlite");
	const id = "community-claim:" + createHash("sha256").update(JSON.stringify([scope, botId])).digest("hex");
	return {
		read() {
			if (!existsSync(path)) return null;
			return withReceiptDatabase(path, (db) => {
				const now = Date.now();
				const row = db.prepare("SELECT body FROM delivery_receipts WHERE id = ? AND expires_at > ?").get(id, now);
				if (typeof row?.body !== "string") return null;
				const stored = JSON.parse(row.body);
				if (!Number.isSafeInteger(stored.ownerPID) || stored.ownerPID <= 0 || stored.request?.botId !== botId) throw new Error("本地群通知领取回执无效");
				if (stored.ownerPID === process.pid) return stored.request;
				if (isRunning(stored.ownerPID)) return "busy";
				return db.prepare("UPDATE delivery_receipts SET body = ? WHERE id = ? AND body = ? AND expires_at > ?").run(JSON.stringify({
					...stored,
					ownerPID: process.pid
				}), id, row.body, now).changes === 1 ? stored.request : "busy";
			});
		},
		save(request, expiresAt) {
			withReceiptDatabase(path, (db) => {
				const now = Date.now();
				db.prepare(`
          INSERT INTO delivery_receipts(id, body, expires_at) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at
          WHERE delivery_receipts.expires_at <= ?
        `).run(id, JSON.stringify({
					ownerPID: process.pid,
					request
				}), expiresAt, now);
			});
		},
		clear(request) {
			withReceiptDatabase(path, (db) => {
				db.prepare("DELETE FROM delivery_receipts WHERE id = ? AND body = ?").run(id, JSON.stringify({
					ownerPID: process.pid,
					request
				}));
			});
		}
	};
}

//#endregion
export { communityClaimReceipt };