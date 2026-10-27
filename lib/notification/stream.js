import { getQQBotAppIds } from "../utils/qqBotIdentity.js";
import { getNotificationBackendConfig } from "../api/bot/config.js";
import { notificationResponseError } from "../api/bot/notification-error.js";
import { dispatchChatNotices, startChatNotices, stopChatNotices } from "./chat.js";
import { dispatchCommunityNotifications } from "./communityDelivery.js";
import { PushFlyMailTask, dispatchStandardMessages } from "../task/pushMessageTask.js";
import { NotificationDispatcher } from "./dispatch.js";
import { logger, onWatchConfigValue } from "alemonjs";

//#region src/notification/stream.ts
let started = false;
let stopWaitingForAppId;
let generation = 0;
let activeController;
let cancelReconnect;
let activeDispatcher;
const consume = async (body, controller, dispatcher) => {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let idleTimer;
	const resetIdleTimer = () => {
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => controller.abort(), 6e4);
	};
	try {
		resetIdleTimer();
		while (true) {
			const { done, value } = await reader.read();
			if (done) throw new Error("通知 SSE 连接已关闭");
			resetIdleTimer();
			buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
			let boundary = buffer.indexOf("\n\n");
			while (boundary >= 0) {
				const frame = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				const event = frame.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim();
				if (event === "stream.ready" || event === "notification.ready") dispatcher.wake();
				boundary = buffer.indexOf("\n\n");
			}
			if (buffer.length > 65536) throw new Error("通知 SSE 事件过大");
		}
	} finally {
		clearTimeout(idleTimer);
		reader.releaseLock();
	}
};
const startNotificationStream = () => {
	if (started) return;
	if (!getQQBotAppIds().length) {
		stopWaitingForAppId ??= onWatchConfigValue(() => startNotificationStream());
		return;
	}
	stopWaitingForAppId?.();
	stopWaitingForAppId = void 0;
	started = true;
	const dispatcher = new NotificationDispatcher([
		{
			name: "飞信",
			run: PushFlyMailTask
		},
		{
			name: "玩家通知",
			run: dispatchStandardMessages
		},
		{
			name: "群通知",
			run: dispatchCommunityNotifications
		},
		{
			name: "运营消息",
			run: dispatchChatNotices
		}
	]);
	activeDispatcher = dispatcher;
	startChatNotices();
	const currentGeneration = ++generation;
	(async () => {
		let retryDelay = 1e3;
		while (true) {
			if (currentGeneration !== generation) break;
			const connectedAt = Date.now();
			let controller;
			try {
				const config = getNotificationBackendConfig();
				controller = new AbortController();
				activeController = controller;
				const connectionTimer = setTimeout(() => controller?.abort(), 1e4);
				let response;
				try {
					response = await fetch(`${config.url}/api/v1/internal/notification-relay/events/stream`, {
						headers: {
							...config.headers,
							Accept: "text/event-stream"
						},
						cache: "no-store",
						...config.channelMode ? { redirect: "error" } : {},
						signal: controller.signal
					});
				} finally {
					clearTimeout(connectionTimer);
				}
				if (!response.ok) {
					const data = response.headers.get("content-type")?.includes("application/json") ? await response.json().catch(() => void 0) : void 0;
					response.body?.cancel();
					throw notificationResponseError("/api/v1/internal/notification-relay/events/stream", { response: {
						status: response.status,
						data,
						headers: { "x-request-id": response.headers.get("x-request-id") }
					} });
				}
				if (!response.body) throw new Error("通知 SSE 响应缺少事件流");
				const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
				if (contentType !== "text/event-stream") {
					response.body.cancel();
					throw new Error(`通知 SSE 响应类型错误: HTTP ${response.status}, Content-Type ${contentType ?? "未提供"}`);
				}
				await consume(response.body, controller, dispatcher);
			} catch (error) {
				if (currentGeneration === generation) logger.error("通知 SSE 中断，准备重连", error);
			} finally {
				if (activeController === controller) activeController = void 0;
			}
			if (currentGeneration !== generation) break;
			if (Date.now() - connectedAt > 3e4) retryDelay = 1e3;
			await new Promise((resolve) => {
				const timer = setTimeout(resolve, retryDelay);
				const cancel = () => {
					clearTimeout(timer);
					resolve();
				};
				cancelReconnect = cancel;
			});
			if (currentGeneration === generation) cancelReconnect = void 0;
			retryDelay = Math.min(retryDelay * 2, 3e4);
		}
	})();
};
const stopNotificationStream = () => {
	started = false;
	stopWaitingForAppId?.();
	stopWaitingForAppId = void 0;
	stopChatNotices();
	activeDispatcher?.stop();
	activeDispatcher = void 0;
	generation++;
	activeController?.abort();
	cancelReconnect?.();
};

//#endregion
export { startNotificationStream, stopNotificationStream };