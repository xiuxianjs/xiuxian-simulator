import { validateBackendTaskConfigPage } from "../../../api/bot/task-config.js";
import { renderAliasOverview, renderOverview, sendPage } from "../views.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { taskRouteNumberText } from "../common.js";
import { Format, useEvent } from "alemonjs";

//#region src/response/task/alias/res.ts
var res_default = async (e) => {
	const [, parentNext] = useEvent();
	const feedback = (text) => {
		sendPage(e, "任务别名", Format.createMarkdown().addText(text));
		return Promise.resolve();
	};
	try {
		const response = await runRobotBusiness(e, "tasks.alias", {
			slot: taskRouteNumberText(e.__route?.params?.slot),
			alias: String(e.__route?.params?.alias ?? "")
		}, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value) || !("mode" in value) || typeof value.mode !== "string" || !["alias-overview", "overview"].includes(value.mode) || !("page" in value)) throw new Error("任务展示配置响应不完整");
			return {
				mode: value.mode,
				page: validateBackendTaskConfigPage(value.page)
			};
		}, parentNext, (reply) => feedback(reply.text));
		if (response.handled) return;
		const { mode, page } = response.data;
		if (mode === "alias-overview") return renderAliasOverview(e, page.config.slots.slice(0, page.limits.slotCount));
		renderOverview(e, page.config.slots, page.limits);
	} catch {
		await feedback("任务操作失败，请稍后再试。");
	}
};

//#endregion
export { res_default as default };