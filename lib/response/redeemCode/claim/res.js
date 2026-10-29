import { BackendAPIError } from "../../../api/bot/client.js";
import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { giftCodeArguments, parseRobotGiftCode } from "../../../api/bot/gift-code-robot-query.js";
import { giftCodeRecoveryTips } from "../../giftCodeRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/redeemCode/claim/res.ts
/**
* 统一礼包码兑换
* 指令：/礼包码 CODE
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	const successFooter = [{
		label: "我的邮件",
		command: "/我的邮件"
	}];
	const md = Format.createMarkdown();
	md.addNewline();
	const [, next] = useEvent();
	const feedback = adviceRenderer(async (reply) => {
		await sendMiddlewareReply(e, {
			...reply,
			title: "礼包码"
		});
	});
	const loaded = await runRobotBusiness(e, "gift-codes.redeem", giftCodeArguments(e.MessageText || ""), parseRobotGiftCode, next, feedback).catch(async (error) => {
		const text = error instanceof BackendAPIError ? error.message : "礼包码兑换失败，请稍后再试";
		await sendMiddlewareReply(e, {
			title: "礼包码",
			heading: "",
			text,
			buttons: [],
			advice: giftCodeRecoveryTips("gift-codes.redeem", text)
		});
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	switch (result.code) {
		case "NO_CODE":
			md.addText("使用 /礼包码 <真实兑换码> 兑换奖励");
			appendMiddlewareAdvice(md, giftCodeRecoveryTips("gift-codes.redeem", "未输入礼包码"));
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "礼包码",
				content: md,
				footer: [{
					label: "我的邮件",
					command: "/我的邮件"
				}]
			}));
			return;
		case "CUSTOM_SUCCESS":
			md.addText(result.displayMsg);
			if (result.rewardSummary.length > 0) {
				md.addNewline();
				md.addNewline();
				for (const reward of result.rewardSummary) {
					md.addText(reward);
					md.addNewline();
				}
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "礼包码",
				content: md,
				footer: successFooter
			}));
	}
});

//#endregion
export { res_default as default };