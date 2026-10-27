import { getQQBotAppId, getQQBotAppIds } from "../../utils/qqBotIdentity.js";
import { getAppConfig } from "../../utils/appConfig.js";
import { isValidTimeout } from "../core/helpers.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/config.ts
const DEFAULT_TIMEOUT_MS = 1e4;
function getBackendConfig() {
	if (typeof process === "undefined") throw new Error("机器人配置仅限服务端使用；浏览器请使用 createClient 显式配置身份");
	const value = getAppConfig().backend ?? {};
	if (value.channel_mode !== void 0 && typeof value.channel_mode !== "boolean") throw new Error("backend.channel_mode 必须为布尔值");
	const timeoutMs = Number(value.api_timeout_ms);
	const config = {
		url: String(value.api_url ?? "").trim().replace(/\/+$/, ""),
		robotAuthToken: String(value.robot_auth_token ?? "").trim(),
		channelMode: value.channel_mode === true,
		channelBotId: getQQBotAppId(),
		timeoutMs: isValidTimeout(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
		logTransportTimings: value.log_transport_timings === true,
		logApiTimings: value.log_api_timings === true,
		workerToken: String(value.worker_token ?? "").trim()
	};
	if (config.channelMode) {
		if (!config.robotAuthToken) throw new Error("渠道通知需要 BOT_TOKEN");
		if (getQQBotAppIds().length > 1 && !config.channelBotId) throw new Error("QQ 多机器人配置缺少有效的 default_bot，无法确定渠道 BOT_TOKEN 对应的机器人");
		let endpoint;
		try {
			endpoint = new URL(config.url);
		} catch {
			throw new Error("渠道 API 需要独立服务的有效 origin");
		}
		if (!(endpoint.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(endpoint.hostname)) && endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash) throw new Error("渠道 API 需要 HTTPS origin；HTTP 仅允许本机回环 IP");
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
export { assertChannelRobotEvent, getBackendConfig, getNotificationBackendConfig, getWorkerBackendConfig };