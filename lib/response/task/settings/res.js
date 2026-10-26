import { renderOverview, renderSlot, sendPage } from "../views.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { validateBackendTaskConfigPage } from "../../../api/bot/task-config.js";
import { taskRouteNumberText } from "../common.js";
import { Format, useEvent } from "alemonjs";

//#region src/response/task/settings/res.ts
var res_default = async (e) => {
	const [, parentNext] = useEvent();
	const feedback = (title, text) => {
		sendPage(e, title, Format.createMarkdown().addText(text));
		return Promise.resolve();
	};
	try {
		const response = await runRobotBusiness(e, "tasks.settings", {
			slot: taskRouteNumberText(e.__route?.params?.slot),
			step: taskRouteNumberText(e.__route?.params?.step),
			content: String(e.__route?.params?.content ?? "")
		}, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value) || !("mode" in value)) throw new Error("任务展示配置响应不完整");
			if (value.mode === "overview" && "page" in value) return {
				mode: "overview",
				page: validateBackendTaskConfigPage(value.page)
			};
			if (value.mode !== "slot" || !("slot" in value) || typeof value.slot !== "number" || !Number.isSafeInteger(value.slot) || value.slot < 1 || value.slot > 10 || !("maxSteps" in value) || ![8, 10].includes(Number(value.maxSteps)) || typeof value.maxSteps !== "number" || !("alias" in value) || typeof value.alias !== "string" || !("steps" in value) || !Array.isArray(value.steps) || !value.steps.every((step) => typeof step === "string")) throw new Error("任务展示配置响应不完整");
			return {
				mode: "slot",
				slot: value.slot,
				steps: value.steps,
				alias: value.alias,
				maxSteps: value.maxSteps
			};
		}, parentNext, (reply) => feedback(reply.title, reply.text));
		if (response.handled) return;
		const result = response.data;
		if (result.mode === "overview") return renderOverview(e, result.page.config.slots, result.page.limits);
		renderSlot(e, result.slot, result.steps, result.maxSteps, result.alias);
	} catch {
		await feedback("任务设置", "任务操作失败，请稍后再试。");
	}
};

//#endregion
export { res_default as default };