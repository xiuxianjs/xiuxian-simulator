import { getBackendConfig } from "./config.js";
import axios from "axios";

//#region src/api/bot/notification-error.ts
function notificationResponseError(path, error) {
	const config = getBackendConfig();
	const redact = (value, limit = 300) => {
		let text = typeof value === "string" ? value.replace(/[\r\n\t]/g, " ") : "";
		for (const secret of [config.robotAuthToken, config.workerToken]) if (secret) text = text.split(secret).join("[REDACTED]");
		return text.slice(0, limit);
	};
	const data = error.response?.data;
	const envelope = data && typeof data === "object" ? data : {};
	const detail = envelope.error && typeof envelope.error === "object" ? envelope.error : {};
	const status = error.response?.status;
	const legacyChannelChat = config.channelMode && path.startsWith("/chat/internal/") && status === 401 && typeof data === "string" && data.trim() === "未授权";
	const code = legacyChannelChat ? "CHANNEL_CHAT_AUTH_MISMATCH" : redact(detail.code ?? error.code, 80);
	const message = legacyChannelChat ? "聊天接口仍返回 Worker 鉴权格式，请核对渠道游戏 API 版本、GAME_MODE=channel 和 /chat/ 代理目标" : redact(detail.message ?? envelope.error);
	const requestId = redact(detail.requestId ?? envelope.requestId ?? error.response?.headers?.["x-request-id"], 128);
	return Object.assign(/* @__PURE__ */ new Error(`通知请求失败 path=${path} status=${status ?? "未响应"} code=${code || "未知"} message=${message || "未提供结构化错误"} requestId=${requestId || "未提供"}`), {
		name: "NotificationRequestError",
		path,
		status,
		code,
		requestId
	});
}
function notificationRequestError(path, error) {
	if (!axios.isAxiosError(error)) return /* @__PURE__ */ new Error(`通知请求失败 path=${path}，未获得 HTTP 响应`);
	return notificationResponseError(path, error);
}

//#endregion
export { notificationRequestError, notificationResponseError };