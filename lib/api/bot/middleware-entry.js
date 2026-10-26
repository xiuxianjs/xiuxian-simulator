import { createBackendRequestContext } from "./context.js";
import { seedEventAccessFacts } from "./access-facts.js";
import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { takeRobotTaskInput } from "./task-business-context.js";
import { seedEventBackendRobotIdentity } from "./identity.js";

//#region src/api/bot/middleware-entry.ts
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const textFields = (value, fields) => record(value) && fields.every((field) => typeof value[field] === "string");
const validMiddlewareNav = (value) => record(value) && Number.isSafeInteger(value.current) && Number(value.current) >= 1 && Number.isSafeInteger(value.total) && Number(value.total) >= Number(value.current) && Number.isSafeInteger(value.count) && Number(value.count) >= 0 && typeof value.command === "string" && value.command.includes("{page}");
const optionalTextFields = (value, fields) => record(value) && fields.every((field) => value[field] === void 0 || typeof value[field] === "string");
function parseRobotMiddlewareResult(value, bid, requireReceipt = true, publicRead = false) {
	const invalid = () => {
		throw new BackendAPIError("聚合中间件响应不完整", "SDK_INVALID_RESPONSE");
	};
	if (!record(value) || !record(value.identity) || value.identity.bid !== bid || !record(value.identity.account)) return invalid();
	const account = value.identity.account;
	const registered = account.status === "registered" && Number.isSafeInteger(account.playerId) && Number(account.playerId) > 0;
	const unregistered = account.status === "unregistered" && account.playerId === null;
	if (!registered && !unregistered) return invalid();
	if (typeof value.outcome !== "string" || ![
		"allow",
		"reject",
		"handled"
	].includes(value.outcome) || typeof value.reason !== "string" || !{
		allow: ["ALLOWED", "UNREGISTERED"],
		reject: [
			"MUTED",
			"MAINTENANCE",
			"COMMAND_MAINTENANCE",
			"ENTRY_FAILED",
			"TASK_ERROR"
		],
		handled: [
			"GUIDE",
			"TASK",
			"TASK_UNMATCHED"
		]
	}[value.outcome]?.includes(value.reason)) return invalid();
	if (value.outcome === "allow" && value.reason === "UNREGISTERED" !== unregistered) return invalid();
	const task = value.taskContinuation;
	const taskReason = [
		"TASK",
		"TASK_ERROR",
		"TASK_UNMATCHED"
	].includes(String(value.reason));
	if ((task !== void 0 || taskReason) && (requireReceipt || !registered)) return invalid();
	if (task !== void 0) {
		if (!record(task) || Object.keys(task).some((key) => ![
			"outcome",
			"command",
			"message"
		].includes(key)) || ![
			"started",
			"expected",
			"next",
			"completed",
			"not_running",
			"invalid_runtime"
		].includes(String(task.outcome)) || !optionalTextFields(task, ["command", "message"]) || [
			"started",
			"expected",
			"next"
		].includes(String(task.outcome)) && (typeof task.command !== "string" || !task.command.trim())) return invalid();
		const advanced = ["next", "completed"].includes(String(task.outcome));
		if (value.reason === "TASK_ERROR" || (value.reason === "TASK" ? advanced : !advanced)) return invalid();
	} else if (value.reason === "TASK" || value.reason === "TASK_UNMATCHED") return invalid();
	if (value.mute !== void 0 && (!record(value.mute) || typeof value.mute.muted !== "boolean" || typeof value.mute.claimed !== "boolean" || typeof value.mute.muteUnlockTime !== "string")) return invalid();
	if (value.guide !== void 0) {
		const guide = value.guide;
		if (!record(guide) || ![
			"step-3",
			"step-4",
			"step-5",
			"promotion-failed",
			"completed",
			"skipped",
			"cleared"
		].includes(String(guide.action)) || !textFields(guide.presentation, [
			"title",
			"heading",
			"text"
		]) || !record(guide.presentation) || typeof guide.presentation.showActionBar !== "boolean" || !Array.isArray(guide.presentation.advice) || !guide.presentation.advice.every((tip) => textFields(tip, ["command", "description"]))) return invalid();
	}
	if (value.entry !== void 0) {
		const entry = value.entry;
		if (!record(entry) || !record(entry.maintenance) || typeof entry.maintenance.disabled !== "boolean" || typeof entry.routeAllowed !== "boolean" || typeof entry.resourcesSettled !== "boolean" || typeof entry.nativeComebackProcessed !== "boolean" || entry.processingError !== void 0 && typeof entry.processingError !== "string" || !optionalTextFields(entry.maintenance, ["reason", "endTime"])) return invalid();
		if (entry.featureGuard !== void 0 && (!record(entry.featureGuard) || typeof entry.featureGuard.blocked !== "boolean" || !optionalTextFields(entry.featureGuard, [
			"feature",
			"reason",
			"realmName"
		]))) return invalid();
	}
	if (!Array.isArray(value.replies) || !value.replies.every((reply) => record(reply) && textFields(reply, [
		"title",
		"heading",
		"text"
	]) && (reply.nav === void 0 || validMiddlewareNav(reply.nav)) && (reply.rawLines === void 0 || Array.isArray(reply.rawLines) && reply.rawLines.length > 0 && reply.rawLines.every((line) => typeof line === "string") && reply.title === "" && reply.heading === "" && reply.text === "" && reply.quote === void 0 && reply.blocks === void 0 && Array.isArray(reply.buttons) && reply.buttons.length === 0 && Array.isArray(reply.advice) && reply.advice.length === 0) && optionalTextFields(reply, ["quote"]) && (reply.blocks === void 0 || Array.isArray(reply.blocks) && reply.blocks.every((block) => record(block) && typeof block.text === "string" && typeof block.quoted === "boolean" && (block.newline === void 0 || typeof block.newline === "boolean") && (block.inlineButtons === void 0 || Array.isArray(block.inlineButtons) && block.inlineButtons.every((button) => textFields(button, ["label", "command"]))))) && Array.isArray(reply.buttons) && reply.buttons.every((button) => textFields(button, ["label", "command"])) && Array.isArray(reply.advice) && reply.advice.every((tip) => textFields(tip, ["command", "description"]))) || !Array.isArray(value.contextWarnings) || !value.contextWarnings.every((warning) => ["RECIPIENT_NOT_SAVED", "PRIVATE_TARGET_NOT_SAVED"].includes(warning))) return invalid();
	if (value.outcome === "allow" && registered && !publicRead) {
		const entry = value.entry;
		if (!record(entry) || entry.routeAllowed !== true || !record(entry.maintenance) || entry.maintenance.disabled !== false || typeof entry.resourcesSettled !== "boolean" || typeof entry.nativeComebackProcessed !== "boolean" || entry.processingError !== void 0 || requireReceipt && entry.resourcesSettled && value.resourceSettlement === void 0) return invalid();
	}
	if (value.resourceSettlement !== void 0 && (!registered || value.outcome !== "allow" || typeof value.resourceSettlement !== "string" || !/^[a-f0-9]{64}$/.test(value.resourceSettlement))) return invalid();
	return value;
}
function middlewareInputFromEvent(event) {
	const platform = String(event.Platform ?? "");
	const botId = event.Target?.BotId ?? event.BotId;
	const input = {
		messageText: event.MessageText ?? "",
		platform,
		...botId ? { botId } : {},
		...event.ChannelId ? { channelId: String(event.ChannelId) } : {}
	};
	const target = event.Target;
	if (target && (target.scope === "c2c" || target.scope === "direct")) input.privateTarget = {
		platform,
		...botId ? { BotId: botId } : {},
		scope: target.scope,
		targetId: target.targetId
	};
	else if (event.DirectUserId) input.privateTarget = {
		platform,
		...botId ? { BotId: botId } : {},
		scope: "c2c",
		targetId: String(event.DirectUserId)
	};
	else if ((event.IsPrivate || event.name.startsWith("private.")) && platform === "onebot") input.privateTarget = {
		platform,
		...botId ? { BotId: botId } : {},
		scope: "c2c",
		targetId: event.UserId
	};
	return input;
}
function businessInputFromEvent(event) {
	const input = middlewareInputFromEvent(event);
	const taskInput = takeRobotTaskInput(event);
	return taskInput === void 0 ? input : {
		...input,
		taskInput
	};
}
const entries = /* @__PURE__ */ new WeakMap();
/** One raw-message request per event. Errors never probe, retry or fall back. */
function getEventMiddlewareEntry(event) {
	const cached = entries.get(event);
	if (cached) {
		if (cached.bid !== event.UserId) return Promise.reject(new BackendAPIError("中间件事件身份已变化", "SDK_INVALID_RESPONSE"));
		return cached.pending;
	}
	const pending = (async () => {
		const context = writeContext(createBackendRequestContext(event));
		const result = parseRobotMiddlewareResult(await requestBackend(event.UserId, "post_robot_middleware_entry", {
			body: middlewareInputFromEvent(event),
			...context
		}), event.UserId);
		seedEventBackendRobotIdentity(event, result.identity);
		const uid = result.identity.account.playerId;
		if (uid !== null) {
			event.uid = uid;
			seedEventAccessFacts(event, event.UserId, uid, result.resourceSettlement ? { resourceSettlement: result.resourceSettlement } : {});
		} else delete event.uid;
		return result;
	})();
	entries.set(event, {
		bid: event.UserId,
		pending
	});
	return pending;
}

//#endregion
export { businessInputFromEvent, getEventMiddlewareEntry, middlewareInputFromEvent, parseRobotMiddlewareResult, validMiddlewareNav };