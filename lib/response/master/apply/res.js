import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterTargetAction } from "../../../api/bot/master-actions.js";
import { masterMentionBid, parseApplyMasterCommand } from "../../../utils/masterCommand.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/master/apply/res.ts
const isPendingMasterApplyMessage = (message) => message.includes("等待对方同意") || message.includes("请等待回应");
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const send = async (text, usage = false, advice = masterRecoveryTips("master.apply", text), buttons = []) => {
		const md = Format.createMarkdown().addText(text);
		if (isPendingMasterApplyMessage(text)) {
			md.addNewline();
			addOptions(md, [{
				label: "我的师门",
				command: "/我的师门"
			}]);
		}
		appendMiddlewareAdvice(md, advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: usage ? "【拜师】" : "",
			content: md,
			footer: buttons
		}));
	};
	const targetBid = await masterMentionBid(mention);
	try {
		const result = await runRobotBusiness(e, "master.apply", {
			targetArg: parseApplyMasterCommand(e.MessageText || "") ?? "",
			...targetBid ? { targetBid } : {}
		}, (value) => parseMasterTargetAction(value, "拜师"), next, adviceRenderer((reply) => send(reply.text, false, reply.advice, reply.buttons)));
		if (result.handled) return;
		if (result.data.outcome === "usage") {
			await send("使用方法：拜师 <师父UID|@目标>", true);
			return;
		}
		await send(result.data.message);
	} catch (error) {
		await send(error instanceof Error ? error.message : "拜师申请失败");
	}
});

//#endregion
export { res_default as default };