import { measureTransportStage, transportCheckpoint } from "../utils/transportTiming.js";
import { hasPendingRobotTaskInput } from "../api/bot/task-business-context.js";
import { selects } from "./config.js";
import { sendPage } from "./task/views.js";
import { runRobotBusiness } from "./robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/mwTaskContinuation.ts
var mwTaskContinuation_default = onResponse(selects, (event) => measureTransportStage("middleware.task-tail.total", async () => {
	transportCheckpoint("middleware.task-tail.enter", event);
	const [, next] = useEvent();
	if (!hasPendingRobotTaskInput(event)) return next();
	try {
		await runRobotBusiness(event, "tasks.continue", {}, () => {
			throw new Error("任务终端动作不能返回业务分支");
		}, next);
	} catch {
		sendPage(event, "任务执行", Format.createMarkdown().addText("任务操作失败，请稍后再试。"));
	}
}, event));

//#endregion
export { mwTaskContinuation_default as default };