import { getAppConfig } from "../utils/appConfig.js";
import { getBackendConfig } from "../api/bot/config.js";
import { classifyFeature } from "./classifier.js";
import { getCurrentEvent, logger } from "alemonjs";

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
	const config = getAppConfig();
	const apiUrl = String(config.analytics_api_url ?? "").trim().replace(/\/+$/, "");
	const apiKey = String(config.analytics_api_key ?? "").trim();
	if (!apiUrl || !apiKey) return null;
	const backend = getBackendConfig();
	if (apiUrl === backend.url) return null;
	const configured = String(config.analytics_appid ?? "").trim();
	const channel = backend.channelMode ? backend.channelBotId : "";
	const ids = [
		ctx.appid,
		configured,
		channel
	].filter((id) => Boolean(id));
	const appid = ids[0];
	if (!appid || !/^[1-9]\d*$/.test(appid) || ids.some((id) => id !== appid)) {
		logger.error("[logap] AppID 缺失、格式错误或与机器人不一致，本次不上报");
		return null;
	}
	return {
		apiUrl,
		apiKey,
		appid
	};
}
function createBatchSender(endpoint, bufferSize, flushMs) {
	const queues = /* @__PURE__ */ new Map();
	async function flush(key, queue) {
		queues.delete(key);
		if (queue.timer) clearTimeout(queue.timer);
		const { apiUrl, apiKey, appid } = queue.route;
		try {
			const res = await fetch(`${apiUrl}${endpoint}?appid=${encodeURIComponent(appid)}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": apiKey
				},
				body: JSON.stringify({
					appid,
					events: queue.buffer
				}),
				signal: AbortSignal.timeout(1e4)
			});
			if (!res.ok) logger.error(`[logap] ${endpoint} 上报失败: ${res.status} ${res.statusText}`);
		} catch (error) {
			logger.error(`[logap] ${endpoint} 上报异常:`, error);
		}
	}
	return { push(item, ctx = currentContext()) {
		const route = getAnalyticsConfig(ctx);
		if (!route) return;
		const key = JSON.stringify([
			route.apiUrl,
			route.appid,
			route.apiKey
		]);
		let queue = queues.get(key);
		if (!queue) {
			queue = {
				route,
				buffer: []
			};
			queues.set(key, queue);
		}
		queue.buffer.push(item);
		const pending = queue;
		if (queue.buffer.length >= bufferSize) flush(key, pending);
		else queue.timer ??= setTimeout(() => {
			flush(key, pending);
		}, flushMs);
	} };
}
const featureSender = createBatchSender("/api/v2/track/features", 50, 5e3);
/**
* 在埋点侧分类后入队，异步上报分析平台
* @param _bid 平台用户 ID，保留现有调用签名
* @param uid 用户ID
* @param commandText 用户输入的原始文本
* @param startTime 指令开始处理的时间戳
* @param success 是否成功
* @param ctx 可选上下文覆盖（不传则用当前事件上下文）
*/
function trackFeatureEvent(_bid, uid, commandText, startTime, success = true, ctx) {
	const responseTimeMs = startTime ? Date.now() - startTime : 0;
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
			command_text: commandText.substring(0, 255),
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
	trackAction(uid, "spar", "战斗", result, 0, detail);
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
export { setActionTrackContext, setTrackContext, trackAction, trackAlchemy, trackBreakthrough, trackCompanion, trackDemonTower, trackDemonTowerSweep, trackDungeon, trackDungeonSweep, trackFeatureEvent, trackFriend, trackGuild, trackLogin, trackMarketBuy, trackMarketList, trackPromotion, trackSpar };