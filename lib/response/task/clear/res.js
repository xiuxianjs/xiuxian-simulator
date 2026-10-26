import { sendPage } from "../views.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { taskRouteNumberText } from "../common.js";
import { Format, useEvent } from "alemonjs";

//#region src/response/task/clear/res.ts
var res_default = async (e) => {
	const [, parentNext] = useEvent();
	const feedback = (text) => {
		sendPage(e, "任务清空", Format.createMarkdown().addText(text));
		return Promise.resolve();
	};
	try {
		const response = await runRobotBusiness(e, "tasks.clear", { slot: taskRouteNumberText(e.__route?.params?.slot) }, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value) || !("slot" in value) || typeof value.slot !== "number" || !Number.isSafeInteger(value.slot) || value.slot < 1 || value.slot > 10) throw new Error("任务清空响应不完整");
			return { slot: value.slot };
		}, parentNext, (reply) => feedback(reply.text));
		if (response.handled) return;
		await feedback(`第${response.data.slot}个任务已清空`);
	} catch {
		await feedback("任务操作失败，请稍后再试。");
	}
};

//#endregion
export { res_default as default };