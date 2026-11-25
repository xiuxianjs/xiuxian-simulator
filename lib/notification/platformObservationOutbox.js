import { getNotificationBackendConfig } from "../api/bot/config.js";
import { finishCommunityNotification, observePlatformPrivateTarget, queueCommunityNotification, readPlatformAvailability, recordCommunityJoinRequest, recordPlatformAvailability, recordPlatformPermissionEvent, rememberPlatformPrivateTarget } from "../api/bot/notification-cache.js";
import { logger } from "alemonjs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { chmodSync, closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

//#region src/notification/platformObservationOutbox.ts
const retryIntervalMs = 5e3;
const retryDelay = (attempts) => Math.min(6e4, retryIntervalMs * 2 ** Math.min(attempts, 4));
var PlatformObservationOutbox = class {
	path;
	scope;
	now;
	live = /* @__PURE__ */ new Set();
	timer;
	replay;
	started = false;
	generation = 0;
	flushFailures = 0;
	constructor(path, scope = () => getNotificationBackendConfig().notificationQueueScope, now = Date.now) {
		this.path = path;
		this.scope = scope;
		this.now = now;
	}
	open() {
		mkdirSync(dirname(this.path), {
			recursive: true,
			mode: 448
		});
		closeSync(openSync(this.path, "a", 384));
		chmodSync(this.path, 384);
		const db = new DatabaseSync(this.path);
		try {
			db.exec(`
        PRAGMA busy_timeout = 250;
        PRAGMA synchronous = FULL;
        PRAGMA secure_delete = ON;
        CREATE TABLE IF NOT EXISTS observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scope TEXT NOT NULL,
          body TEXT NOT NULL,
          retry_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        ) STRICT;
        CREATE INDEX IF NOT EXISTS observations_due ON observations(scope, retry_at, id);
      `);
		} catch (error) {
			db.close();
			throw error;
		}
		return db;
	}
	scopeKey(scope = this.scope()) {
		return createHash("sha256").update(scope).digest("hex");
	}
	recordAvailability(...observation) {
		return this.record(observation);
	}
	recordPermission(...observation) {
		return this.record({ permission: observation });
	}
	recordPrivateTarget(...observation) {
		return this.record({ privateTarget: observation }, () => rememberPlatformPrivateTarget(...observation));
	}
	deferPrivateTarget(scope, ...observation) {
		this.save(this.scopeKey(scope), { privateTarget: observation });
	}
	recordMemberWelcome(target, memberId, observedAt, observedOnly) {
		return this.record({ welcome: {
			target,
			memberId,
			observedAt,
			observedOnly
		} });
	}
	recordJoinRequest(target, request) {
		return this.record({ joinRequest: {
			target,
			request
		} });
	}
	recordCommunityFinish(scope, eventId, consumer, retry, deferred) {
		return this.record({ communityFinish: [
			eventId,
			consumer,
			retry,
			deferred,
			randomUUID()
		] }, void 0, this.scopeKey(scope));
	}
	async record(observation, deliver, scope = this.scopeKey()) {
		let id;
		try {
			id = this.save(scope, observation);
		} catch (error) {
			if (Array.isArray(observation) || !("communityFinish" in observation)) throw error;
			logger.error("群通知确认无法落盘，继续提交原租约的确认", error);
			await this.send(observation, scope);
			return;
		}
		this.live.add(id);
		try {
			await (deliver ? deliver() : this.send(observation, scope));
			const db = this.open();
			try {
				db.prepare("DELETE FROM observations WHERE id = ?").run(id);
			} finally {
				db.close();
			}
		} finally {
			this.live.delete(id);
		}
	}
	checkCommunityScope(scope) {
		if (this.scopeKey() !== scope) throw new Error("通知后端归属已变化，保留原群待补写记录");
	}
	async sendMemberWelcome(welcome, scope) {
		const { target, memberId, observedAt, observedOnly } = welcome;
		await recordPlatformAvailability(target, true, observedAt, memberId, observedOnly);
		this.checkCommunityScope(scope);
		const state = await readPlatformAvailability(target, memberId);
		this.checkCommunityScope(scope);
		if (state?.available && state.updatedAt <= observedAt) await queueCommunityNotification(target, "welcome", memberId, state.updatedAt, state.updatedAt);
	}
	async sendJoinRequest({ target, request }, scope) {
		await recordCommunityJoinRequest(target, request);
		if (!request.autoApproved) {
			this.checkCommunityScope(scope);
			await queueCommunityNotification(target, "request", request.id, request.observedAt);
		}
	}
	send(observation, scope) {
		if (Array.isArray(observation)) return recordPlatformAvailability(...observation);
		if ("privateTarget" in observation) return observePlatformPrivateTarget(...observation.privateTarget);
		if ("communityFinish" in observation) {
			this.checkCommunityScope(scope);
			return finishCommunityNotification(...observation.communityFinish).catch((error) => {
				const response = error;
				if (!(error instanceof Error) || error.name !== "NotificationRequestError" || response.status !== 409 || response.code !== "CONFLICT") throw error;
			});
		}
		if ("welcome" in observation) return this.sendMemberWelcome(observation.welcome, scope);
		if ("joinRequest" in observation) return this.sendJoinRequest(observation.joinRequest, scope);
		return recordPlatformPermissionEvent(...observation.permission);
	}
	save(scope, observation) {
		const db = this.open();
		try {
			return db.prepare("INSERT INTO observations(scope, body, retry_at) VALUES (?, ?, ?)").run(scope, JSON.stringify(observation), this.now() + retryIntervalMs).lastInsertRowid;
		} finally {
			db.close();
		}
	}
	async flush() {
		if (this.replay) return this.replay;
		if (!existsSync(this.path)) return;
		this.replay = this.replayDue();
		try {
			await this.replay;
		} finally {
			this.replay = void 0;
		}
	}
	async replayDue() {
		const scope = this.scopeKey();
		const generation = this.generation;
		const db = this.open();
		try {
			const rows = db.prepare("SELECT id, body, attempts FROM observations WHERE scope = ? AND retry_at <= ? ORDER BY retry_at, id LIMIT 32").all(scope, this.now());
			const remove = db.prepare("DELETE FROM observations WHERE id = ?");
			const reschedule = db.prepare("UPDATE observations SET attempts = attempts + 1, retry_at = ? WHERE id = ?");
			const failures = [];
			for (const row of rows) {
				if (generation !== this.generation || scope !== this.scopeKey()) break;
				if (this.live.has(row.id)) continue;
				try {
					await this.send(JSON.parse(row.body), scope);
				} catch (error) {
					reschedule.run(this.now() + retryDelay(row.attempts + 1), row.id);
					failures.push(error);
					const status = error instanceof Error && error.name === "NotificationRequestError" ? error.status : void 0;
					if (status === void 0 || ![
						400,
						404,
						409,
						422
					].includes(status)) break;
					continue;
				}
				remove.run(row.id);
			}
			if (failures.length === 1) throw failures[0];
			if (failures.length > 1) throw new AggregateError(failures, "多条通知平台事件补写失败");
		} finally {
			db.close();
		}
	}
	start() {
		if (this.started) return;
		this.started = true;
		this.schedule();
	}
	schedule() {
		if (this.started) {
			const generation = this.generation;
			this.timer = setTimeout(() => {
				this.flush().then(() => {
					this.flushFailures = 0;
				}).catch((error) => {
					this.flushFailures++;
					logger.error("通知平台事件补写失败，保留待补写记录", error);
				}).finally(() => {
					if (generation === this.generation) this.schedule();
				});
			}, retryDelay(this.flushFailures));
			this.timer.unref?.();
		}
	}
	async stop() {
		this.started = false;
		this.generation++;
		clearTimeout(this.timer);
		await this.replay?.catch(() => {});
	}
};
const platformObservationOutbox = new PlatformObservationOutbox(resolve("data/notification-availability/observations.sqlite"));

//#endregion
export { PlatformObservationOutbox, platformObservationOutbox };