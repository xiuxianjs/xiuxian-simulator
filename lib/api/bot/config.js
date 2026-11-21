import { getAppConfig } from "../../utils/appConfig.js";
import { getQQBotAppId, getQQBotAppIds } from "../../utils/qqBotIdentity.js";
import { DEFAULT_API_BASE, isValidApiBase, isValidTimeout } from "../core/helpers.js";
import { selectBackendRoute } from "./backend-availability.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/config.ts
const DEFAULT_TIMEOUT_MS = 1e4;
const normalizeBackendUrl = (value) => String(value ?? "").trim().replace(/\/+$/, "");
function isBackendOrigin(url) {
	try {
		const endpoint = new URL(url);
		return ["http:", "https:"].includes(endpoint.protocol) && !endpoint.username && !endpoint.password && endpoint.pathname === "/" && !endpoint.search && !endpoint.hash;
	} catch {
		return false;
	}
}
function hasNotificationBackendUrl() {
	const backend = getAppConfig().backend;
	return Boolean(normalizeBackendUrl(backend?.api_base_url) || normalizeBackendUrl(backend?.api_url));
}
function getBackendConfig() {
	if (typeof process === "undefined") throw new Error("机器人配置仅限服务端使用；浏览器请使用 createClient 显式配置身份");
	const value = getAppConfig().backend ?? {};
	if (value.channel_mode !== void 0 && typeof value.channel_mode !== "boolean") throw new Error("backend.channel_mode 必须为布尔值");
	const timeoutMs = Number(value.api_timeout_ms);
	const primaryUrl = normalizeBackendUrl(value.api_base_url);
	const legacyUrl = normalizeBackendUrl(value.api_url);
	const channelMode = value.channel_mode === true;
	const primaryBase = primaryUrl && value.api_base_path !== void 0 ? value.api_base_path : DEFAULT_API_BASE;
	if (!isValidApiBase(primaryBase)) throw new Error("backend.api_base_path 必须是单层路径前缀，例如 /api 或 /channel-api");
	const configuredUrl = primaryUrl || legacyUrl;
	if ((channelMode || primaryUrl) && !isBackendOrigin(configuredUrl)) throw new Error(`backend.${primaryUrl ? "api_base_url" : "api_url"} 必须是 HTTP(S) origin`);
	const fallbackUrl = primaryUrl && isBackendOrigin(legacyUrl) ? legacyUrl : "";
	const route = selectBackendRoute(configuredUrl, primaryBase, fallbackUrl, channelMode);
	const { url, apiBase } = route;
	const config = {
		...route,
		scope: apiBase === "/api" ? url : url + apiBase,
		robotAuthToken: String(value.robot_auth_token ?? "").trim(),
		channelMode,
		channelBotId: getQQBotAppId(),
		timeoutMs: isValidTimeout(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
		logTransportTimings: value.log_transport_timings === true,
		logApiTimings: value.log_api_timings === true,
		workerToken: String(value.worker_token ?? "").trim()
	};
	if (config.channelMode) {
		if (!config.robotAuthToken) throw new Error("渠道通知需要 BOT_TOKEN");
		if (getQQBotAppIds().length > 1 && !config.channelBotId) throw new Error("QQ 多机器人配置缺少有效的 default_bot，无法确定渠道 BOT_TOKEN 对应的机器人");
	}
	return config;
}
function assertChannelRobotEvent(event) {
	const config = getBackendConfig();
	if (config.channelMode && (!config.channelBotId || event.Platform !== "qq-bot" || event.BotId !== config.channelBotId || event.Target?.BotId && event.Target.BotId !== config.channelBotId)) throw new Error("当前平台事件与渠道机器人配置不匹配");
}
/** Notification gateways accept a merchant token only in explicitly enabled channel mode. */
function getNotificationBackendConfig() {
	const config = getBackendConfig();
	const headers = {};
	if ((config.channelMode || process.env.login === "qq-bot" || getCurrentEvent()?.Platform === "qq-bot") && !getQQBotAppIds().length) throw new Error("QQ AppID 尚未就绪，请等待扫码登录或框架配置更新");
	if (!config.url) throw new Error("通知 API 后端地址未配置");
	if (config.channelMode) headers.Authorization = `Bearer ${config.robotAuthToken}`;
	else {
		if (!config.workerToken) throw new Error("通知 API Worker Token 未配置");
		headers["X-Worker-Token"] = config.workerToken;
	}
	return {
		...config,
		headers
	};
}
function getWorkerBackendConfig() {
	const config = getBackendConfig();
	if (config.channelMode) throw new Error("此全服运营接口尚未支持渠道机器人");
	return config;
}

//#endregion
export { assertChannelRobotEvent, getBackendConfig, getNotificationBackendConfig, getWorkerBackendConfig, hasNotificationBackendUrl };