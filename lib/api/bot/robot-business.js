import { createBackendReadRequestContext, createBackendRequestContext } from "./context.js";
import { measureTransportStageSync } from "../../utils/transportTiming.js";
import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { businessInputFromEvent, parseRobotMiddlewareResult } from "./middleware-entry.js";
import { validateHomeOverview } from "./player-overview.js";
import { parseOnboarding } from "./onboarding.js";
import { logger } from "alemonjs";

//#region src/api/bot/robot-business.ts
function isRobotPublicEntry(operation) {
	return operation === "account.register" || operation === "navigation.strategy" || operation === "navigation.more" || operation === "navigation.help" || operation === "glossary.query" || operation === "glossary.category" || operation === "tianshu.content";
}
async function requestRobotBusiness(event, operation, args, decode, request) {
	const input = businessInputFromEvent(event);
	if (operation === "daily-fortune.claim" && event.Target?.scope === "group") input.channelId = event.Target.targetId;
	return parseRobotBusinessEnvelope(await requestBackend(event.UserId, "post_v2_robot_business_operation", {
		path: { operation },
		body: {
			...input,
			arguments: args
		},
		...writeContext(request ?? (operation === "checkin.view" || operation === "storyline.state" || operation === "limited-event.payment-state" || operation === "sponsor.payment-state" || operation === "normal.payment-state" ? createBackendReadRequestContext() : createBackendRequestContext(event, operation === "limited-event.payment-timeout" || operation === "sponsor.payment-timeout" || operation === "normal.payment-timeout" ? operation : operation.startsWith("onboarding.") ? operation : void 0)))
	}), event.UserId, decode, isRobotPublicEntry(operation));
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
		if (view.status !== "completed") throw new Error("结算后的指引必须保持已完成状态");
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