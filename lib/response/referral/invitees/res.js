import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { displayCurrencyText } from "../../../constants/currency.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { referralRecoveryTips } from "../../referralRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { referralInviteesArguments, referralInviteesDecoder } from "../../../api/bot/referral-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/referral/invitees/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	const args = referralInviteesArguments(e.MessageText ?? "");
	const page = args.page ?? 1;
	const [, next] = useEvent();
	const footer = [];
	try {
		const loaded = await runRobotBusiness(e, "referral.invitees", args, referralInviteesDecoder(args.page), next, adviceRenderer((reply) => sendMiddlewareReply(e, {
			...reply,
			title: "我的邀请"
		})));
		if (loaded.handled) return;
		const data = loaded.data;
		const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
		md.addText(`我邀请的道友：${data.total} 人 · 第 ${page}/${pages} 页`);
		md.addNewline();
		if (!data.items.length) {
			md.addText(data.total === 0 ? "还没有道友绑定你的邀请码，分享给新来的道友吧。" : "这一页没有道友，请返回上一页。");
			appendMiddlewareAdvice(md, referralRecoveryTips("referral.invitees", "本页暂无记录"));
		}
		for (const item of data.items) {
			const lines = [
				`${item.name} · UID ${item.userId}`,
				`当前境界：${item.realmName}`,
				`成长奖励：待领取 ${item.pendingRewards} 条 · 已领取 ${item.claimedRewards} 条`
			];
			if (item.nextRealmReward) lines.push(`下一境界目标：${item.nextRealmReward.goal}`, `达成奖励：${item.nextRealmReward.rewards.map(displayCurrencyText).join("、")}`);
			if (item.nextVipReward) lines.push(`下一 VIP 目标：${item.nextVipReward.goal}`, `达成奖励：${item.nextVipReward.rewards.map(displayCurrencyText).join("、")}`);
			if (!item.nextRealmReward && !item.nextVipReward) lines.push("暂无后续成长奖励档位");
			md.addBlockquote(createQuoteMarkdown(lines, [{
				label: "查看信息",
				command: `/查看信息 ${item.userId}`
			}, {
				label: "邀请入队",
				command: `/邀请入队 ${item.userId}`
			}]));
		}
		if (data.items.some((item) => item.pendingRewards > 0)) footer.push({
			label: "领取奖励",
			command: "/领取邀请奖励"
		});
		if (page > 1) footer.push({
			label: "上一页",
			command: `/我的邀请 ${page - 1}`
		});
		if (page < pages) footer.push({
			label: "下一页",
			command: `/我的邀请 ${page + 1}`
		});
	} catch (error) {
		md.addText(getCommandErrorMessage(error));
		appendMiddlewareAdvice(md, referralRecoveryTips("referral.invitees", "查询失败"));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的邀请",
		header: [{
			label: "返回",
			command: "/邀请码"
		}],
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };