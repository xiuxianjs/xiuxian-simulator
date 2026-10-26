import { measureTransportStage, measureTransportStageSync, transportCheckpoint } from "../utils/transportTiming.js";
import { isRobotTaskCompatibilityBlocked, robotTaskPresentationEvent } from "../api/bot/task-business-context.js";
import { sendMiddlewareReply } from "./middlewareReply.js";
import { selects } from "./config.js";
import mwBan_default from "./mwBan.js";
import { sendPage, sendShortcut } from "./task/views.js";
import mw_default from "./mw.js";
import mwMute_default from "./mwMute.js";
import resGuide_default from "./resGuide.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/mwBusinessFallback.ts
var mwBusinessFallback_default = onResponse(selects, (event) => measureTransportStage("middleware.fallback.total", async () => {
	transportCheckpoint("middleware.fallback.enter", event);
	const result = event.__res;
	if (!result) {
		const [, next] = useEvent();
		next();
		return;
	}
	measureTransportStageSync("middleware.receipt.consume", () => {
		delete event.__res;
	}, event);
	if (!result.success || result.branch !== "middleware") {
		logger.error("非正常业务兜底收到无效分支");
		return;
	}
	transportCheckpoint(`middleware.fallback.reason.${result.middleware.reason}`, event);
	const task = result.middleware.taskContinuation;
	if (result.middleware.reason === "TASK" && task) {
		if ((task.outcome === "started" || task.outcome === "expected") && task.command) sendShortcut(event, task.command, task.message);
		else sendPage(robotTaskPresentationEvent(event), "任务执行", Format.createMarkdown().addText(task.outcome === "invalid_runtime" ? "当前任务已失效，请重新发送 /任务执行 <槽位>" : "当前没有进行中的任务，请先发送 /任务执行 <槽位>"));
		return;
	}
	if (result.middleware.reason === "TASK_UNMATCHED") {
		if (isRobotTaskCompatibilityBlocked(event)) {
			mwBan_default(event);
			return;
		}
		const [, next] = useEvent();
		return next();
	}
	if (await measureTransportStage("middleware.mute", () => mwMute_default(event, result.middleware), event) === false) return;
	if (await measureTransportStage("middleware.guide", () => resGuide_default(event, result.middleware), event) === false) return;
	if (await measureTransportStage("middleware.player-entry", () => mw_default(event, result.middleware), event) === false) return;
	for (const reply of result.middleware.replies) await measureTransportStage("middleware.reply.render", () => sendMiddlewareReply(event, reply), event);
}, event));

//#endregion
export { mwBusinessFallback_default as default };