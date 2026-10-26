import { renderOverview, sendPage, sendShortcut } from "../views.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTaskRuntimeAction } from "../../../api/bot/task-runtime-action.js";
import { Format, useEvent } from "alemonjs";

//#region src/response/task/overview/res.ts
var res_default = async (e) => {
	const [, parentNext] = useEvent();
	const feedback = (text) => {
		sendPage(e, "任务设置", Format.createMarkdown().addText(text));
		return Promise.resolve();
	};
	try {
		const response = await runRobotBusiness(e, "tasks.overview", {}, (value) => {
			const data = parseBackendTaskRuntimeAction(value);
			if (!(data.outcome === "current" && data.command) && !data.page) throw new Error("任务展示配置响应不完整");
			return data;
		}, parentNext, (reply) => feedback(reply.text));
		if (response.handled) return;
		const result = response.data;
		if (result.outcome === "current" && result.command) return sendShortcut(e, result.command, `当前正在执行第${result.slot}个任务，请继续`);
		const page = result.page;
		renderOverview(e, page.config.slots, page.limits);
	} catch {
		await feedback("任务状态获取失败，请稍后再试。");
	}
};

//#endregion
export { res_default as default };