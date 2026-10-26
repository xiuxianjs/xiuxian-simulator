import { sendPage } from "../views.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTaskRuntimeCancel } from "../../../api/bot/task-runtime-cancel.js";
import { Format, useEvent } from "alemonjs";

//#region src/response/task/cancel/res.ts
var res_default = async (e) => {
	const [, parentNext] = useEvent();
	const feedback = (text) => {
		sendPage(e, "任务取消", Format.createMarkdown().addText(text));
		return Promise.resolve();
	};
	try {
		if ((await runRobotBusiness(e, "tasks.cancel", {}, parseBackendTaskRuntimeCancel, parentNext, (reply) => feedback(reply.text))).handled) return;
		await feedback("当前连锁任务已取消");
	} catch {
		await feedback("任务操作失败，请稍后再试。");
	}
};

//#endregion
export { res_default as default };