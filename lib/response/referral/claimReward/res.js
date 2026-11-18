import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { referralRecoveryTips } from "../../referralRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotReferralClaim } from "../../../api/bot/referral-actions-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/referral/claimReward/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown();
		content.addText(text);
		appendMiddlewareAdvice(content, referralRecoveryTips("referral.claim", text));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "领取邀请奖励",
			content,
			footer: [{
				label: "邀请码",
				command: "/邀请码"
			}]
		}));
	};
	let result;
	try {
		const loaded = await runRobotBusiness(e, "referral.claim", {}, parseRobotReferralClaim, next, adviceRenderer((reply) => sendMiddlewareReply(e, {
			...reply,
			title: "领取邀请奖励",
			buttons: [...reply.buttons, {
				label: "邀请码",
				command: "/邀请码"
			}]
		})));
		if (loaded.handled) return;
		result = loaded.data;
	} catch {
		await renderFailure("领取失败，请稍后再试");
		return;
	}
	const md = Format.createMarkdown();
	md.addText(result.displayMsg);
	if (result.rewards.length > 0) {
		md.addNewline();
		md.addNewline();
		for (const reward of result.rewards) {
			md.addText(reward);
			md.addNewline();
		}
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "领取邀请奖励",
		content: md,
		footer: [{
			label: "邀请码",
			command: "/邀请码"
		}]
	}));
});

//#endregion
export { res_default as default };