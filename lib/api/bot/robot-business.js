import { createBackendReadRequestContext, createBackendRequestContext } from "./context.js";
import { measureTransportStageSync } from "../../utils/transportTiming.js";
import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { parseOnboarding } from "./onboarding.js";
import { businessInputFromEvent, parseRobotMiddlewareResult } from "./middleware-entry.js";
import { beginGamePresentation } from "../../utils/gamePresentation.js";
import { validateHomeOverview } from "./player-overview.js";
import { logger } from "alemonjs";
import { setTimeout as setTimeout$1 } from "node:timers/promises";

//#region src/api/bot/robot-business.ts
function isRobotPublicEntry(operation) {
	return operation === "account.register" || operation === "navigation.strategy" || operation === "navigation.more" || operation === "navigation.help" || operation === "glossary.query" || operation === "glossary.category" || operation === "tianshu.content";
}
async function requestRobotBusiness(event, operation, args, decode, request) {
	await beginGamePresentation(event);
	const input = businessInputFromEvent(event);
	if (operation === "daily-fortune.claim" && event.Target?.scope === "group") input.channelId = event.Target.targetId;
	const parameters = {
		path: { operation },
		body: {
			...input,
			arguments: args
		},
		...writeContext(request ?? (operation === "checkin.view" || operation === "storyline.state" || operation === "limited-event.payment-state" || operation === "sponsor.payment-state" || operation === "normal.payment-state" ? createBackendReadRequestContext() : createBackendRequestContext(event, operation === "limited-event.payment-timeout" || operation === "sponsor.payment-timeout" || operation === "normal.payment-timeout" ? operation : operation.startsWith("onboarding.") ? operation : void 0)))
	};
	let result;
	try {
		result = await requestBackend(event.UserId, "post_v2_robot_business_operation", parameters);
	} catch (error) {
		if (!(operation === "skill-books.batch-decompose" || operation === "cave.accelerate" && args.mode === "all" && args.accelerator === "ripen") || !(error instanceof BackendAPIError) || error.code !== "SDK_TIMEOUT" && error.status !== 504) throw error;
		for (const wait of [
			0,
			500,
			1500
		]) {
			if (wait) await setTimeout$1(wait);
			try {
				result = await requestBackend(event.UserId, "post_v2_robot_business_receipt", parameters);
				return parseRobotBusinessEnvelope(result, event.UserId, decode, isRobotPublicEntry(operation));
			} catch (lookupError) {
				if (!(lookupError instanceof BackendAPIError) || lookupError.code !== "ROBOT_RECEIPT_NOT_READY") break;
			}
		}
		throw new BackendAPIError("暂未查到本次回执。", "ROBOT_RECEIPT_UNAVAILABLE");
	}
	return parseRobotBusinessEnvelope(result, event.UserId, decode, isRobotPublicEntry(operation));
}
function parseRobotBusinessEnvelope(value, bid, decode, publicRead = false) {
	const invalid = () => {
		throw new BackendAPIError("机器人业务响应不完整", "SDK_INVALID_RESPONSE");
	};
	if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
	const result = value;
	if (typeof result.success !== "boolean" || !["business", "middleware"].includes(String(result.branch))) return invalid();
	const middleware = parseRobotMiddlewareResult(result.middleware, bid, false, publicRead);
	if (middleware.resourceSettlement !== void 0) return invalid();
	if (!result.success) {
		if (result.data !== void 0 || !(result.branch === "middleware" && middleware.outcome === "reject" || result.branch === "business" && middleware.outcome === "allow")) return invalid();
		return {
			success: false,
			branch: result.branch,
			middleware
		};
	}
	if (result.branch === "middleware") {
		if (middleware.reason === "TASK_ERROR" || middleware.outcome === "allow" && middleware.reason !== "UNREGISTERED" || result.data !== void 0) return invalid();
		return {
			success: true,
			branch: "middleware",
			middleware
		};
	}
	const uid = middleware.identity.account.playerId;
	if (middleware.outcome !== "allow" || uid === null && !publicRead) return invalid();
	const data = decode(result.data, uid ?? 0);
	const followup = {};
	if (result.onboardingPending !== void 0 && result.onboardingPending !== false) followup.onboardingPending = true;
	if (result.onboarding !== void 0 && !followup.onboardingPending) try {
		const view = parseOnboarding(result.onboarding);
		if (![
			"active",
			"soft",
			"completed"
		].includes(view.status)) throw new Error("结算后的指引状态无效");
		followup.onboarding = view;
	} catch (error) {
		logger.warn("[onboarding] 结算后的指引无法解析，保留实际业务回执", error);
		followup.onboardingPending = true;
	}
	return {
		success: true,
		branch: "business",
		middleware,
		data,
		...followup
	};
}
function parseRobotBusinessResult(value, bid) {
	return parseRobotBusinessEnvelope(value, bid, (data, uid) => validateHomeOverview(data, uid));
}
async function getRobotHomeOverview(event) {
	const input = measureTransportStageSync("home.api.input", () => ({
		body: businessInputFromEvent(event),
		...writeContext(createBackendRequestContext(event))
	}), event);
	const result = await requestBackend(event.UserId, "post_v2_robot_home_overview", input);
	return measureTransportStageSync("home.response.validate", () => parseRobotBusinessResult(result, event.UserId), event);
}

//#endregion
export { getRobotHomeOverview, isRobotPublicEntry, parseRobotBusinessEnvelope, parseRobotBusinessResult, requestRobotBusiness };