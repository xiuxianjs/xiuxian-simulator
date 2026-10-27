import { getCommandBusinessErrorMessage } from "../utils/commandError.js";
import { measureTransportStage, measureTransportStageSync, transportCheckpoint } from "../utils/transportTiming.js";
import { seedEventBackendRobotIdentity } from "../api/bot/identity.js";
import { hasPendingRobotTaskInput, markRobotTaskCompatibilityBlocked } from "../api/bot/task-business-context.js";
import { isRobotPublicEntry, requestRobotBusiness } from "../api/bot/robot-business.js";
import { presentMiddlewareReply, sendMiddlewareReply } from "./middlewareReply.js";
import { withBountyContinuation } from "./bountyRecovery.js";
import { withBusinessRecovery } from "./businessRecovery.js";
import { withTribulationRecovery } from "../response-apps/tribulation/recovery.js";
import mwFeatureTrack_default from "./mwFeatureTrack.js";
import mwBan_default from "./mwBan.js";
import { sendShortcut } from "./task/views.js";
import { platform, useMode } from "@alemonjs/qq-bot";
import { logger } from "alemonjs";

//#region src/response/robotBusiness.ts
async function runRobotBusiness(event, operation, args, decode, parentNext, renderFeedback, request) {
	const publicEntry = isRobotPublicEntry(operation) || operation === "tasks.continue";
	if (!publicEntry && await interceptTaskCompatibility(event, parentNext)) return { handled: true };
	if (!publicEntry && mwBan_default(event) !== true) return { handled: true };
	let result;
	try {
		result = await requestRobotBusiness(event, operation, args, decode, request);
	} catch (error) {
		const text = getCommandBusinessErrorMessage(error);
		if (text === void 0) throw error;
		const reply = withTribulationRecovery(operation, args, withBountyContinuation(operation, args, withBusinessRecovery(operation, {
			title: "操作未完成",
			heading: "",
			text,
			buttons: [],
			advice: []
		})));
		if (renderFeedback && (["tribulation.command", "tribulation.public"].includes(operation) || ["skill-books.wudao", "soul-artifacts.grade-upgrade"].includes(operation) && renderFeedback.preservesAdvice)) await renderFeedback(reply);
		else await sendMiddlewareReply(event, reply, "footer");
		return { handled: true };
	}
	if (!result.success && result.branch === "business" && result.middleware.replies.length) {
		const index = result.middleware.replies.length - 1;
		result.middleware.replies[index] = withTribulationRecovery(operation, args, withBountyContinuation(operation, args, withBusinessRecovery(operation, result.middleware.replies[index])));
	}
	return finishRobotBusiness(event, result, parentNext, renderFeedback, !publicEntry, operation);
}
async function finishRobotBusiness(event, result, parentNext, renderFeedback, trackCommand = true, operation = "") {
	transportCheckpoint(`middleware.result.${result.success ? "success" : "failure"}.${result.branch}.${result.middleware.reason}`, event);
	const uid = result.middleware.identity.account.playerId;
	if (uid !== null) event.uid = uid;
	else delete event.uid;
	measureTransportStageSync("middleware.identity.seed", () => seedEventBackendRobotIdentity(event, result.middleware.identity), event);
	if (trackCommand) measureTransportStageSync("middleware.feature.track", () => mwFeatureTrack_default(event), event);
	if (result.middleware.contextWarnings.length) logger.warn("业务请求平台地址未保存", result.middleware.contextWarnings);
	const task = result.middleware.taskContinuation;
	if (task?.outcome === "next" && task.command) sendShortcut(event, task.command);
	if (result.success && result.branch === "middleware") {
		event.__res = result;
		transportCheckpoint("middleware.parent.next", event);
		parentNext();
		return { handled: true };
	}
	const guard = result.middleware.entry?.featureGuard;
	if (!result.success && result.branch === "middleware" && result.middleware.reason === "ENTRY_FAILED" && guard?.blocked) {
		const refusal = withBusinessRecovery("realm.overview", {
			title: "功能未解锁",
			heading: "",
			text: `境界条件未满足：${guard.reason ?? "当前境界尚未达到该功能要求"}；当前境界：${guard.realmName ?? "未知境界"}。`,
			buttons: [{
				label: "我的境界",
				command: "/我的境界"
			}],
			advice: []
		});
		if (result.middleware.replies.length) result.middleware.replies[result.middleware.replies.length - 1] = refusal;
		else result.middleware.replies.push(refusal);
	}
	for (const [index, reply] of result.middleware.replies.entries()) {
		const businessFeedback = !result.success && result.branch === "business" && index === result.middleware.replies.length - 1;
		const immediateAlchemy = operation.startsWith("alchemy.") && reply.title === "炼丹" && reply.buttons.some((button) => button.command.startsWith("/炼丹"));
		if (businessFeedback && renderFeedback && !immediateAlchemy && !reply.rawLines && (!reply.advice.length || renderFeedback.preservesAdvice)) await measureTransportStage("middleware.feedback.render", () => renderFeedback(presentMiddlewareReply(reply)), event);
		else await measureTransportStage("middleware.reply.render", () => sendMiddlewareReply(event, reply, immediateAlchemy || businessFeedback ? "footer" : false), event);
	}
	if (!result.success) return { handled: true };
	return {
		handled: false,
		data: result.data,
		...result.onboarding ? { onboarding: result.onboarding } : {},
		...result.onboardingPending ? { onboardingPending: true } : {}
	};
}
async function interceptTaskCompatibility(event, parentNext) {
	if (!hasPendingRobotTaskInput(event) || event.Platform !== platform || !useMode(event)("guild")) return false;
	markRobotTaskCompatibilityBlocked(event);
	await finishRobotBusiness(event, await requestRobotBusiness(event, "tasks.continue", {}, () => {
		throw new Error("任务终端动作不能返回业务分支");
	}), parentNext, void 0, false);
	return true;
}

//#endregion
export { finishRobotBusiness, interceptTaskCompatibility, runRobotBusiness };