import { AnalyticsOutbox, maxAnalyticsBatchBytes } from "./outbox.js";
import { getAppConfig } from "../utils/appConfig.js";
import { getQQBotAppId, getQQBotAppIds } from "../utils/qqBotIdentity.js";
import { getBackendConfig } from "../api/bot/config.js";
import { classifyFeature } from "./classifier.js";
import { getCurrentEvent, logger } from "alemonjs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

//#region src/analytics/index.ts
/**
* 统一埋点追踪 SDK
*
* 合并了原来分开的 featureTracker 和 actionTracker：
* - 功能埋点（feature）：记录"用了什么指令"，由中间件自动触发
* - 行为事件（action）：记录"操作结果如何"，由业务逻辑手动调用
*
* 共享同一份 config 读取、上下文、HTTP 发送逻辑。
* 两种事件各自维护缓冲队列，发往不同 API 端点。
* 设计为 fire-and-forget，不影响主流程性能。
*
* 位于 `src/analytics/` 而不是 `src/model/`：这里只做面向第三方分析平台的
* 埋点上报（fire-and-forget HTTP），不读写任何游戏状态，也不依赖 `@src/db`。
*/
const contexts = /* @__PURE__ */ new WeakMap();
function setTrackContext(ctx) {
	const event = getCurrentEvent();
	if (event) contexts.set(event, ctx);
}
function currentContext() {
	const event = getCurrentEvent();
	if (!event) return {};
	return {
		appid: event.Platform === "qq-bot" ? String(event.BotId ?? "") : "",
		scene: event.IsPrivate ? "private" : "public",
		channelId: String(event.ChannelId ?? ""),
		platform: String(event.Platform ?? ""),
		...contexts.get(event)
	};
}
/** 在入队时捕获配置，定时发送时不再读取其他机器人的运行上下文。 */
function getAnalyticsConfig(ctx = currentContext()) {
	const routes = configuredAnalyticsRoutes();
	const appid = ctx.platform === "qq-bot" ? ctx.appid : ctx.platform ? "" : getQQBotAppId();
	const route = routes.find((candidate) => candidate.appid === appid);
	if (routes.length && !route) logger.error("[logap] 事件缺少有效的 QQ 机器人身份，本次不上报");
	return route;
}
function configuredAnalyticsRoutes() {
	const config = getAppConfig();
	const apiUrl = String(config.analytics_api_url ?? "").trim().replace(/\/+$/, "");
	const apiKey = String(config.analytics_api_key ?? "").trim();
	if (!apiUrl || !apiKey) return [];
	const target = URL.parse(apiUrl);
	const backend = getBackendConfig();
	if (!target || !["http:", "https:"].includes(target.protocol) || target.username || target.password || target.search || target.hash || apiUrl === backend.url) return [];
	return getQQBotAppIds().filter((appid) => !backend.channelMode || appid === backend.channelBotId).map((appid) => ({
		apiUrl,
		apiKey,
		appid
	}));
}
let outbox;
let managed = false;
let deliveryRunning = false;
function startAnalyticsDelivery() {
	managed = true;
	deliveryRunning = true;
	const routes = configuredAnalyticsRoutes();
	if (!outbox && routes.length) {
		let store;
		try {
			const directory = String(getAppConfig().analytics_queue_dir ?? "").trim();
			store = new AnalyticsOutbox(resolve(directory ? directory : "data/robot-analytics-outbox"));
			const features = store.list("/api/v2/track/features");
			const actions = store.list("/api/v2/track/actions");
			outbox = store;
			featureSender.restore(features);
			actionSender.restore(actions);
		} catch {
			store?.close();
			outbox = void 0;
			logger.error("[logap] 无法打开持久队列，埋点发送已暂停");
		}
	}
	featureSender.configure(routes);
	actionSender.configure(routes);
}
function stopAnalyticsDelivery() {
	deliveryRunning = false;
	featureSender.stop();
	actionSender.stop();
	outbox?.close();
	outbox = void 0;
}
const retryRetained = /* @__PURE__ */ new Set();
/** Explicit replay after operators fix a rejected upload; original batch identity is preserved. */
const retryRetainedAnalyticsBatches = () => {
	for (const retry of retryRetained) retry();
};
const deliveryStatus = {
	pending: 0,
	retrying: 0,
	retained: 0,
	dropped: 0
};
/** Delivery counters for the current process. Pending, retrying and held rows are restored at startup. */
const getAnalyticsDeliveryStatus = () => ({ ...deliveryStatus });
const uploadReasons = /* @__PURE__ */ new Set([
	"invalid_payload",
	"payload_too_large",
	"invalid_batch_size",
	"invalid_event",
	"invalid_event_data",
	"invalid_batch_id",
	"appid_mismatch",
	"batch_conflict",
	"storage_unavailable",
	"invalid_appid",
	"unknown_appid",
	"source_unavailable",
	"upload_key_unavailable",
	"invalid_api_key",
	"registry_unavailable",
	"bot_inactive",
	"bot_ownership_changed",
	"uid_ownership_mismatch"
]);
function retryAfterMs(value) {
	if (!value) return 0;
	const delay = /^\d+$/.test(value) ? Number(value) * 1e3 : Date.parse(value) - Date.now();
	return Number.isNaN(delay) ? 0 : Math.min(2147483647, Math.max(0, delay));
}
function createBatchSender(endpoint, bufferSize, flushMs) {
	const queues = /* @__PURE__ */ new Map();
	const pending = /* @__PURE__ */ new Map();
	const maxBatchesPerApp = 100;
	const maxBatches = 400;
	const maxConcurrent = 8;
	const activeByApp = /* @__PURE__ */ new Map();
	let active = 0;
	let runtime = new AbortController();
	const credentials = /* @__PURE__ */ new Map();
	const routeKey = (route) => JSON.stringify([route.apiUrl, route.appid]);
	function schedule(batch, retryAt) {
		batch.state = "retrying";
		deliveryStatus.retrying++;
		batch.timer = setTimeout(() => {
			batch.timer = void 0;
			batch.state = "ready";
			deliveryStatus.retrying--;
			pump();
		}, Math.max(0, retryAt - Date.now()));
	}
	function saveState(batch, retryAt, held) {
		try {
			outbox?.update(batch.id, batch.attempts, retryAt, held);
			return true;
		} catch {
			logger.error(`[logap] 无法更新持久队列: batch=${batch.id}`);
			return false;
		}
	}
	function pump() {
		if (managed && (!deliveryRunning || !outbox)) return;
		const signal = runtime.signal;
		for (const batch of pending.values()) {
			if (active >= maxConcurrent) break;
			const appid = batch.route.appid;
			const appActive = activeByApp.get(appid) ?? 0;
			const apiKey = credentials.get(routeKey(batch.route));
			if (batch.state !== "ready" || !apiKey || appActive >= 2) continue;
			batch.state = "sending";
			active++;
			activeByApp.set(appid, appActive + 1);
			deliver(batch, apiKey, signal).finally(() => {
				if (signal.aborted) return;
				const remaining = (activeByApp.get(appid) ?? 1) - 1;
				if (remaining) activeByApp.set(appid, remaining);
				else activeByApp.delete(appid);
				active--;
				pump();
			});
		}
	}
	async function deliver(batch, apiKey, signal) {
		batch.attempts++;
		const { apiUrl, appid } = batch.route;
		let retryable = false;
		let reason = "network_error";
		let retryAfter = 0;
		let status = "network";
		try {
			const res = await fetch(`${apiUrl}${endpoint}/batches?appid=${encodeURIComponent(appid)}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": apiKey,
					"Idempotency-Key": batch.id
				},
				body: batch.body,
				signal: AbortSignal.any([signal, AbortSignal.timeout(1e4)]),
				redirect: "error"
			});
			status = String(res.status);
			retryable = res.status === 408 || res.status === 429 || res.status >= 500 || res.ok;
			retryAfter = retryAfterMs(res.headers.get("Retry-After"));
			let result;
			const responseText = await res.text();
			try {
				result = JSON.parse(responseText);
			} catch {}
			if (signal.aborted) return;
			if (res.ok && result?.code === 0 && result.data?.received === batch.count) {
				outbox?.acknowledge(batch.id);
				pending.delete(batch.id);
				deliveryStatus.pending--;
				return;
			}
			if (res.ok && typeof result?.code === "number" && result.code !== 0) retryable = false;
			reason = typeof result?.reason === "string" && uploadReasons.has(result.reason) ? result.reason : res.ok ? "invalid_receipt" : "http_error";
		} catch {
			retryable ||= status === "network";
		}
		if (signal.aborted) return;
		logger.error(`[logap] ${endpoint} 上报失败: ${status}; appid=${appid}; batch=${batch.id}; events=${batch.count}; attempt=${batch.attempts}; ${reason}`);
		if (retryable) {
			const delay = batch.attempts < 3 ? 1e3 * 2 ** (batch.attempts - 1) : Math.min(3e5, 3e4 * 2 ** Math.min(batch.attempts - 3, 4)) * (1 + Math.random() * .2);
			const retryAt = Date.now() + Math.max(delay, retryAfter);
			saveState(batch, retryAt, 0);
			schedule(batch, retryAt);
		} else {
			batch.authHeld = status === "401" || reason === "bot_inactive" || reason === "bot_ownership_changed";
			const currentKey = credentials.get(routeKey(batch.route));
			if (batch.authHeld && currentKey && currentKey !== apiKey && saveState(batch, 0, 0)) {
				batch.state = "ready";
				return;
			}
			saveState(batch, 0, batch.authHeld ? 2 : 1);
			batch.state = "retained";
			deliveryStatus.retained++;
			logger.error(`[logap] 批次待人工处理: batch=${batch.id}; retained=${deliveryStatus.retained}; 等待人工处理`);
		}
	}
	function releaseHeld(batch) {
		batch.attempts = 0;
		if (saveState(batch, 0, 0)) {
			batch.authHeld = false;
			batch.state = "ready";
			deliveryStatus.retained--;
		}
	}
	retryRetained.add(() => {
		for (const batch of pending.values()) if (batch.state === "retained") releaseHeld(batch);
		pump();
	});
	function flush(key, queue) {
		queues.delete(key);
		if (queue.timer) clearTimeout(queue.timer);
		const appBatches = [...pending.values()].filter((batch) => batch.route.appid === queue.route.appid);
		const { apiUrl, appid } = queue.route;
		const batch = {
			id: randomUUID(),
			route: {
				apiUrl,
				appid
			},
			body: `${queue.prefix}${queue.buffer.join(",")}]}`,
			count: queue.buffer.length,
			attempts: 0,
			state: "ready"
		};
		let accepted = false;
		try {
			accepted = outbox ? outbox.put(endpoint, {
				...batch.route,
				id: batch.id,
				body: batch.body,
				count: batch.count,
				attempts: 0,
				retryAt: 0,
				held: 0
			}) : !managed && pending.size < maxBatches && appBatches.length < maxBatchesPerApp;
		} catch {
			logger.error(`[logap] 持久队列写入失败: appid=${appid}; batch=${batch.id}`);
		}
		if (!accepted) {
			deliveryStatus.dropped += batch.count;
			logger.error(`[logap] 批次未入队: appid=${appid}; events=${batch.count}`);
			return;
		}
		pending.set(batch.id, batch);
		deliveryStatus.pending++;
		pump();
	}
	return {
		configure(routes) {
			const previous = new Map(credentials);
			credentials.clear();
			for (const route of routes) credentials.set(routeKey(route), route.apiKey);
			for (const batch of pending.values()) {
				const key = routeKey(batch.route);
				const apiKey = credentials.get(key);
				if (batch.state === "retained" && batch.authHeld && apiKey && apiKey !== previous.get(key)) releaseHeld(batch);
			}
			pump();
		},
		restore(rows) {
			for (const row of rows) {
				const batch = {
					id: row.id,
					route: {
						apiUrl: row.apiUrl,
						appid: row.appid
					},
					body: row.body,
					count: row.count,
					attempts: row.attempts,
					authHeld: row.held === 2,
					state: row.held ? "retained" : "ready"
				};
				pending.set(batch.id, batch);
				deliveryStatus.pending++;
				if (row.held) deliveryStatus.retained++;
				else if (row.retryAt > Date.now()) schedule(batch, row.retryAt);
			}
		},
		stop() {
			for (const [key, queue] of queues) flush(key, queue);
			runtime.abort();
			runtime = new AbortController();
			for (const batch of pending.values()) {
				clearTimeout(batch.timer);
				deliveryStatus.pending--;
				if (batch.state === "retained") deliveryStatus.retained--;
				if (batch.state === "retrying") deliveryStatus.retrying--;
			}
			pending.clear();
			credentials.clear();
			activeByApp.clear();
			active = 0;
		},
		push(item, ctx = currentContext()) {
			const route = getAnalyticsConfig(ctx);
			if (!route) return;
			if (managed && !deliveryRunning) return;
			if (!managed) credentials.set(routeKey(route), route.apiKey);
			const key = routeKey(route);
			const prefix = `{"appid":${JSON.stringify(route.appid)},"events":[`;
			const envelopeBytes = Buffer.byteLength(prefix) + 2;
			const encoded = JSON.stringify(item);
			const eventBytes = Buffer.byteLength(encoded);
			if (envelopeBytes + eventBytes > 8388608) {
				deliveryStatus.dropped++;
				logger.error(`[logap] 单条事件超出上报体积限制: appid=${route.appid}`);
				return;
			}
			let queue = queues.get(key);
			if (queue && queue.bytes + eventBytes + 1 > 8388608) {
				flush(key, queue);
				queue = void 0;
			}
			if (!queue) {
				queue = {
					route,
					prefix,
					bytes: envelopeBytes,
					buffer: []
				};
				queues.set(key, queue);
			}
			queue.bytes += eventBytes + Number(queue.buffer.length > 0);
			queue.buffer.push(encoded);
			const pendingQueue = queue;
			if (queue.buffer.length >= bufferSize) flush(key, pendingQueue);
			else queue.timer ??= setTimeout(() => {
				flush(key, pendingQueue);
			}, flushMs);
		}
	};
}
function canTrackFeature(commandText, ctx) {
	return Boolean(classifyFeature(commandText) && getAnalyticsConfig(ctx));
}
const featureSender = createBatchSender("/api/v2/track/features", 50, 5e3);
/**
* 在埋点侧分类后入队，异步上报分析平台
* @param _bid 平台用户 ID，保留现有调用签名
* @param uid 用户ID
* @param commandText 用户输入的原始文本
* @param responseTimeMs 从指令处理开始到业务结果返回的耗时
* @param success 是否成功
* @param ctx 可选上下文覆盖（不传则用当前事件上下文）
*/
function trackFeatureEvent(_bid, uid, commandText, responseTimeMs = 0, success = true, ctx) {
	const timestamp = (/* @__PURE__ */ new Date()).toISOString();
	try {
		const classification = classifyFeature(commandText);
		if (!classification) return;
		const context = {
			...currentContext(),
			...ctx
		};
		featureSender.push({
			uid,
			feature_name: classification.feature_name,
			feature_category: classification.feature_category,
			command_text: "/" + classification.feature_name,
			response_time_ms: responseTimeMs,
			success,
			scene: context.scene ?? "",
			channel_id: context.channelId ?? "",
			platform: context.platform ?? "",
			timestamp
		}, context);
	} catch (error) {
		logger.error("[logap] 分类失败:", error);
	}
}
const actionSender = createBatchSender("/api/v2/track/actions", 30, 8e3);
/** 记录一条行为事件 */
function trackAction(uid, action, category, result, value = 0, detail = {}) {
	try {
		const context = currentContext();
		actionSender.push({
			uid,
			action,
			category,
			result,
			value,
			detail: JSON.stringify(detail),
			scene: context.scene ?? "",
			channel_id: context.channelId ?? "",
			platform: context.platform ?? "",
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		});
	} catch {}
}
/** 突破事件 */
function trackBreakthrough(uid, success, detail) {
	trackAction(uid, "breakthrough", "修炼", success ? "success" : "fail", 0, detail);
}
/** 晋级事件 */
function trackPromotion(uid, success, detail) {
	trackAction(uid, "promotion", "修炼", success ? "success" : "fail", 0, detail);
}
/** 秘境事件 */
function trackDungeon(uid, success, detail) {
	trackAction(uid, "dungeon", "战斗", success ? "success" : "fail", 0, detail);
}
/** 扫荡秘境事件 */
function trackDungeonSweep(uid, detail) {
	trackAction(uid, "dungeon_sweep", "战斗", "success", detail.times ?? 0, detail);
}
/** 比试事件 */
function trackSpar(uid, result, detail) {
	trackAction(uid, "spar", "战斗", result, detail.settledCount ?? 0, detail);
}
/** 妖塔挑战事件 */
function trackDemonTower(uid, success, detail) {
	trackAction(uid, "demon_tower", "战斗", success ? "success" : "fail", detail.starsEarned ?? 0, detail);
}
/** 妖塔扫荡事件 */
function trackDemonTowerSweep(uid, detail) {
	trackAction(uid, "demon_tower_sweep", "战斗", "success", detail.layersSwept ?? 0, detail);
}
/** 交易所上架事件 */
function trackMarketList(uid, success, detail) {
	trackAction(uid, "market_list", "经济", success ? "success" : "fail", detail.price ?? 0, detail);
}
/** 交易所购买事件 */
function trackMarketBuy(uid, success, detail) {
	trackAction(uid, "market_buy", "经济", success ? "success" : "fail", detail.price ?? 0, detail);
}
/** 好友变动事件 */
function trackFriend(uid, action, targetId) {
	trackAction(uid, action, "社交", "success", 0, { targetId });
}
/** 道侣事件 */
function trackCompanion(uid, action, success, detail = {}) {
	trackAction(uid, action, "社交", success ? "success" : "fail", 0, detail);
}
/** 宗门事件 */
function trackGuild(uid, action, success, detail = {}) {
	trackAction(uid, action, "社交", success ? "success" : "fail", 0, detail);
}
/** 炼丹事件 */
function trackAlchemy(uid, success, detail) {
	trackAction(uid, "alchemy", "成长", success ? "success" : "fail", detail.exp ?? 0, detail);
}
/** 登录/活跃事件（每用户 5 分钟内只上报一次） */
const loginSeen = /* @__PURE__ */ new Map();
const LOGIN_DEDUP_MS = 3e5;
function trackLogin(uid) {
	const now = Date.now();
	let route;
	try {
		route = getAnalyticsConfig();
	} catch {
		return;
	}
	if (!route) return;
	const key = JSON.stringify([
		route.apiUrl,
		route.appid,
		uid
	]);
	if (now - (loginSeen.get(key) ?? 0) < LOGIN_DEDUP_MS) return;
	loginSeen.set(key, now);
	if (loginSeen.size > 1e3) {
		for (const [k, v] of loginSeen) if (now - v >= LOGIN_DEDUP_MS) loginSeen.delete(k);
	}
	trackAction(uid, "login", "日常", "success");
}
/** @deprecated 请使用 setTrackContext */
const setActionTrackContext = setTrackContext;

//#endregion
export { canTrackFeature, getAnalyticsDeliveryStatus, retryRetainedAnalyticsBatches, setActionTrackContext, setTrackContext, startAnalyticsDelivery, stopAnalyticsDelivery, trackAction, trackAlchemy, trackBreakthrough, trackCompanion, trackDemonTower, trackDemonTowerSweep, trackDungeon, trackDungeonSweep, trackFeatureEvent, trackFriend, trackGuild, trackLogin, trackMarketBuy, trackMarketList, trackPromotion, trackSpar };