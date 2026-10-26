import { sendPage, sendShortcut } from "../views.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTaskRuntimeAction } from "../../../api/bot/task-runtime-action.js";
import { taskRouteNumberText } from "../common.js";
import { Format, useEvent } from "alemonjs";

//#region src/response/task/execute/res.ts
var res_default = async (e) => {
	const [, parentNext] = useEvent();
	const feedback = (text) => {
		sendPage(e, "任务执行", Format.createMarkdown().addText(text));
		return Promise.resolve();
	};
	try {
		const response = await runRobotBusiness(e, "tasks.start", { slot: taskRouteNumberText(e.__route?.params?.slot) }, (value) => {
			const data = parseBackendTaskRuntimeAction(value);
			if (data.outcome !== "started" || !data.command) throw new Error("任务运行状态机响应不完整");
			return data;
		}, parentNext, (reply) => feedback(reply.text));
		if (response.handled) return;
		const result = response.data;
		if (result.outcome === "started" && result.command) return sendShortcut(e, result.command);
	} catch {
		await feedback("任务操作失败，请稍后再试。");
	}
};

//#endregion
export { res_default as default };