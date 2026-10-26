import { sendMiddlewareReply } from "../../middlewareReply.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/guide/action/res.ts
var res_default = onResponse(selects, async (event) => {
	const [, parentNext] = useEvent();
	const operation = event.MessageText?.includes("跳过") ? "guide.skip" : "guide.continue";
	try {
		await runRobotBusiness(event, operation, {}, () => ({}), parentNext);
	} catch {
		await sendMiddlewareReply(event, {
			title: "新手引导",
			heading: "",
			text: "引导操作失败，请稍后再试。",
			buttons: [{
				label: "继续",
				command: "/继续"
			}, {
				label: "跳过剧情",
				command: "/跳过引导"
			}],
			advice: []
		});
	}
});

//#endregion
export { res_default as default };