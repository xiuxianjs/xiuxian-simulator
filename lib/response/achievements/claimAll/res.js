import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { achievementRecoveryTips } from "../../achievementRecovery.js";
import { selects } from "../../config.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import App from "../../../response-apps/achievements/claimAll/app.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/achievements/claimAll/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const result = await App({
			event: e,
			next
		});
		if (!result) return;
		if (result.code === "LOCKED") {
			sendFifthLayerLockedPage({
				bid,
				isPrivate,
				message,
				title: "成就奖励",
				realmName: result.data.realmName
			});
			return;
		}
		const md = Format.createMarkdown();
		if (result.code === "INVALID_USER") md.addText("请先踏入仙途");
		else if (result.code === "NO_CLAIMABLE") {
			md.addText("当前没有可领取的成就奖励。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.claim-all", "当前没有可领取的成就奖励。"));
		} else if (result.code !== "OK") {
			md.addText("成就领取结果未获完整确认，请先核对进度和奖励。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.claim-all", "一键领取成就失败，请稍后再试。"));
		} else {
			md.addBold(`成功领取 ${result.data.claimedCount} 个成就奖励`);
			md.addNewline();
			for (const item of result.data.claimed) {
				md.addBlockquote(Format.createMarkdown().addText(`【${item.categoryLabel}】${item.achievementName}`));
				if (item.rewardText) md.addBlockquote(Format.createMarkdown().addText(`获得：${item.rewardText}`));
			}
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "成就奖励",
			content: md
		}));
	} catch (error) {
		logger.error("一键领取成就失败:", error);
		const md = Format.createMarkdown();
		md.addText("成就领取结果未获完整确认，请先核对进度和奖励。");
		appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.claim-all", "一键领取成就失败，请稍后再试。"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "成就奖励",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };