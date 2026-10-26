import { sha256Hex } from "./hash.js";
import { randomUUID } from "node:crypto";

//#region src/api/bot/context.ts
function createBackendRequestContext(event, operation) {
	const eventId = String(event.InteractionId ?? "").trim() || String(event.MessageId ?? "").trim();
	const requestId = sha256Hex(JSON.stringify([
		event.Platform ?? "",
		event.BotId ?? "",
		event.UserId ?? "",
		eventId
	]));
	const idempotencyKey = operation ? sha256Hex(JSON.stringify([requestId, operation])) : requestId;
	return eventId ? {
		requestId,
		idempotencyKey
	} : { requestId };
}
function createBackendReadRequestContext() {
	const requestId = randomUUID();
	return {
		requestId,
		idempotencyKey: requestId
	};
}
const diagnosticEvents = /* @__PURE__ */ new WeakMap();
function getEventTransportDiagnosticContext(event) {
	if (!event) return;
	const cached = diagnosticEvents.get(event);
	if (cached) return cached;
	const text = "MessageText" in event && typeof event.MessageText === "string" ? event.MessageText.trim() : "";
	const commandKey = /^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+\d+)|(?:\s+p\d+))?$/.test(text) ? "storyline.list" : /^(!|！|\/|#|＃)?商店(?:\s|$)/.test(text) ? "shop.list" : /^(!|！|\/|#|＃)?(?:我|我的信息|我的资料|我的编号|我的控制台|个人信息|个人资料|个人编号|个人控制台)$/.test(text) ? "home.overview" : /^(!|！|\/|#|＃)?我的功法(?:\s|$)/.test(text) ? "skill-books.learned" : "unknown";
	const name = "name" in event ? event.name : void 0;
	const eventKind = name === "message.create" || name === "private.message.create" ? "message" : name === "interaction.create" || name === "private.interaction.create" ? "interaction" : "unknown";
	const value = {
		eventTraceId: randomUUID(),
		commandKey,
		eventKind
	};
	diagnosticEvents.set(event, value);
	return value;
}

//#endregion
export { createBackendReadRequestContext, createBackendRequestContext, getEventTransportDiagnosticContext };