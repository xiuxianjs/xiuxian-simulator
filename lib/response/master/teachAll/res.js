import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterAction } from "../../../api/bot/master-actions.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/teachAll/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	try {
		const loaded = await runRobotBusiness(e, "master.teach-all", {}, parseMasterAction, next);
		if (loaded.handled) return;
		const quote = Format.createMarkdown();
		loaded.data.message.split("\n").filter(Boolean).forEach((line) => quote.addText(line).addNewline());
		appendMiddlewareAdvice(quote, masterRecoveryTips("master.teach-all", loaded.data.message));
		addOptions(quote, [{
			label: "我的师门",
			command: "/我的师门"
		}]);
		md.addBlockquote(quote);
	} catch (error) {
		md.addText(error instanceof Error ? error.message : "传功失败，请稍后重试");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.teach-all", "批量执行未获完整确认"));
	}
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId,
		title: "【一键传功】",
		content: md
	}));
});

//#endregion
export { res_default as default };