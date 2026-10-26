import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { referralRecoveryTips } from "../../referralRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotReferralBind, referralBindArguments } from "../../../api/bot/referral-actions-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/referral/bindCode/res.ts
/**
* /绑定邀请码 <code> - 新人绑定邀请码
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown();
		content.addText(text);
		appendMiddlewareAdvice(content, referralRecoveryTips("referral.bind", text));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "绑定邀请码",
			content
		}));
	};
	let result;
	try {
		const loaded = await runRobotBusiness(e, "referral.bind", referralBindArguments(e.MessageText ?? ""), parseRobotReferralBind, next, adviceRenderer((reply) => sendMiddlewareReply(e, {
			...reply,
			title: "绑定邀请码"
		})));
		if (loaded.handled) return;
		result = loaded.data;
	} catch {
		await renderFailure("绑定失败，请稍后再试");
		return;
	}
	switch (result.code) {
		case "NO_CODE": {
			const md = Format.createMarkdown();
			md.addText("请输入邀请码");
			md.addNewline();
			md.addText("格式：/绑定邀请码 tt-用户ID");
			appendMiddlewareAdvice(md, referralRecoveryTips("referral.bind", "请输入邀请码"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "绑定邀请码",
				content: md
			}));
			return;
		}
		case "SUCCESS": {
			const md = Format.createMarkdown();
			md.addText(result.displayMsg);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "绑定邀请码",
				content: md,
				footer: result.showBar ? [{
					label: "邀请码",
					command: "/邀请码"
				}] : void 0
			}));
		}
	}
});

//#endregion
export { res_default as default };