import { getBackendConfig, getNotificationBackendConfig } from "../api/bot/config.js";
import { dispatchChatNotices, startChatNotices, stopChatNotices } from "./chat.js";
import { dispatchCommunityNotifications } from "./communityDelivery.js";
import { PushMessageTask } from "../task/pushMessageTask.js";
import { logger } from "alemonjs";

//#region src/notification/stream.ts
let started = false;
let generation = 0;
let activeController;
let cancelReconnect;
const dispatch = (controller) => {
	const jobs = [PushMessageTask(), dispatchCommunityNotifications()];
	if (!getBackendConfig().channelMode) jobs.push(dispatchChatNotices());
	Promise.all(jobs).catch((error) => {
		logger.error("通知 SSE 投递失败，重新连接后补领", error);
		controller.abort();
	});
};
const consume = async (body, controller) => {
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
				if (event === "stream.ready" || event === "notification.ready") dispatch(controller);
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
	const config = getBackendConfig();
	started = true;
	if (!config.channelMode) startChatNotices();
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
				if (!response.ok || !response.body) {
					response.body?.cancel();
					throw new Error(`通知 SSE 连接失败: HTTP ${response.status}`);
				}
				const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
				if (contentType !== "text/event-stream") {
					response.body.cancel();
					throw new Error(`通知 SSE 响应类型错误: HTTP ${response.status}, Content-Type ${contentType ?? "未提供"}`);
				}
				await consume(response.body, controller);
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
	stopChatNotices();
	generation++;
	activeController?.abort();
	cancelReconnect?.();
};

//#endregion
export { startNotificationStream, stopNotificationStream };