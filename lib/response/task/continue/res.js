import { measureTransportStageSync } from "../../../utils/transportTiming.js";
import { setRobotTaskInput } from "../../../api/bot/task-business-context.js";
import { normalizeTaskCommandText, toTaskInputRouteCommand } from "../common.js";

//#region src/response/task/continue/res.ts
var res_default = (event, next) => measureTransportStageSync("route.task-escape", () => {
	const match = normalizeTaskCommandText(event.MessageText).match(/^(!|！|\/|#|＃)?任务\s+(.+)$/);
	if (!match) return next();
	const input = match[2] ?? "";
	setRobotTaskInput(event, input);
	event.MessageText = toTaskInputRouteCommand(input);
	return next();
}, event);

//#endregion
export { res_default as default };