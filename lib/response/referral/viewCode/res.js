import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { referralRecoveryTips } from "../../referralRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotReferralCode } from "../../../api/bot/referral-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/referral/viewCode/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFailure = async () => {
		const content = Format.createMarkdown();
		content.addText("查询邀请码信息失败，请稍后再试");
		appendMiddlewareAdvice(content, referralRecoveryTips("referral.code", "查询邀请码信息失败，请稍后再试"));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "邀请码",
			content
		}));
	};
	let result;
	try {
		const loaded = await runRobotBusiness(e, "referral.code", {}, parseRobotReferralCode, next, adviceRenderer((reply) => sendMiddlewareReply(e, {
			...reply,
			title: "邀请码"
		})));
		if (loaded.handled) return;
		result = loaded.data;
	} catch {
		await renderFailure();
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`我的邀请码：${result.referralCode}`);
	md.addNewline();
	md.addText(`累计邀请：${result.inviteCount} 人`);
	md.addNewline();
	md.addText(result.inviteLimit === null ? "邀请人数无上限" : `邀请人数上限：${result.inviteLimit} 人`);
	md.addNewline();
	md.addText(`分享给新人：/绑定邀请码 ${result.referralCode}`);
	md.addNewline();
	if (result.pendingRewards > 0) {
		md.addText(`待领取奖励：${result.pendingRewards}条`);
		md.addNewline();
	}
	const rewardsMd = Format.createMarkdown();
	rewardsMd.addText("邀请规则与奖励");
	rewardsMd.addNewline();
	rewardsMd.addButton(markdownButtonLabel("我邀请的道友"), { data: "/我的邀请" });
	rewardsMd.addNewline();
	rewardsMd.addButton(markdownButtonLabel("人数奖励"), { data: "/邀请人数奖励" });
	rewardsMd.addText(" ");
	rewardsMd.addButton(markdownButtonLabel("VIP奖励"), { data: "/邀请VIP奖励" });
	rewardsMd.addText(" ");
	rewardsMd.addButton(markdownButtonLabel("境界奖励"), { data: "/邀请境界奖励" });
	if (result.pendingRewards > 0) {
		rewardsMd.addNewline();
		rewardsMd.addButton(markdownButtonLabel("领取奖励"), { data: "/领取邀请奖励" });
	}
	md.addBlockquote(rewardsMd);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "邀请码",
		header: [{
			label: "仙缘与供奉",
			command: "/更多 权益与充值"
		}],
		content: md
	}));
});

//#endregion
export { res_default as default };