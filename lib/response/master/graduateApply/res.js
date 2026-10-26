import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseMasterAction } from "../../../api/bot/master-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/graduateApply/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let data;
	try {
		const result = await runRobotBusiness(e, "master.graduation-apply", {}, parseMasterAction, next);
		if (result.handled) return;
		data = result.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "操作失败")
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(data.message);
	appendMiddlewareAdvice(md, masterRecoveryTips("master.graduation-apply", data.message));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };