import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { achievementProgressTips, achievementRecoveryTips } from "../../achievementRecovery.js";
import { selects } from "../../config.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import res_default$1 from "../claimCombatPower/res.js";
import App from "../../../response-apps/achievements/combatPower/app.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/achievements/combatPower/res.ts
/**
* 战力成就分类页
* 指令：/成就 战力
* 展示战力成就分类的总体情况、下一目标和可领取状态
*/
/** 格式化战力数值展示（不足1万显示原值，超过1万显示x万） */
function formatPower(value) {
	if (value >= 1e4) {
		const w = value / 1e4;
		return Number.isInteger(w) ? `${w}万` : `${w.toFixed(1)}万`;
	}
	return value.toLocaleString();
}
var res_default = onResponse(selects, async (e) => {
	const text = String(e.MessageText ?? "").replace(/^[!！/#＃]/u, "").trim();
	if (/^成就\s+战力\s+(领取|一键领取)$/u.test(text)) return res_default$1.current(e);
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
				title: "战力成就",
				realmName: result.data.realmName
			});
			return;
		}
		const md = Format.createMarkdown();
		if (result.code === "INVALID_USER") {
			md.addText("请先踏入仙途");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (result.code !== "OK") {
			md.addText("查询战力成就失败，请稍后再试。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.combat-power", "查询战力成就失败，请稍后再试。"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const { currentPower, totalCount, completedCount, claimableCount, currentClaimable, nextTarget, allCompleted, historicalUnclaimed } = result.data;
		if (totalCount === 0) {
			md.addText("暂无战力成就配置。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.combat-power", "暂无战力成就配置。"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "战力成就",
				content: md
			}));
			return;
		}
		md.addText(`当前战力✊${currentPower.toLocaleString()}`);
		md.addNewline();
		md.addText(`已达成：${completedCount} / ${totalCount}`);
		md.addNewline();
		md.addText(`待领取：${claimableCount}`);
		md.addNewline();
		md.addNewline();
		const footer = [];
		if (currentClaimable) md.addBlockquote(createQuoteMarkdown([
			`当前可领取 · ${currentClaimable.name}`,
			`目标战力✊${formatPower(currentClaimable.threshold)}`,
			...currentClaimable.rewardText ? [`奖励：${currentClaimable.rewardText}`] : [],
			...currentClaimable.remainingClaimableCount > 0 ? [`另有 ${currentClaimable.remainingClaimableCount} 项待领取`] : []
		], [{
			label: "一键领取",
			command: "/成就 战力 一键领取"
		}]));
		else if (allCompleted) md.addText("🎉 所有战力成就已达成！");
		else if (nextTarget) md.addBlockquote(createQuoteMarkdown([
			`下一目标 · ${nextTarget.name}`,
			`目标战力✊${formatPower(nextTarget.threshold)}`,
			nextTarget.description ?? "",
			...nextTarget.rewardText ? [`奖励：${nextTarget.rewardText}`] : [],
			`还差：${nextTarget.remainingPower.toLocaleString()} 战力`
		].filter(Boolean)));
		if (historicalUnclaimed && !currentClaimable) {
			md.addNewline().addText("存在历史已达成但本页当前未显示可领取的记录，请核对成就状态。");
			if (currentClaimable || !nextTarget) appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.combat-power", "历史记录待核对"));
		}
		if (!currentClaimable && nextTarget) appendMiddlewareAdvice(md, [...achievementProgressTips("combat_power"), ...historicalUnclaimed ? achievementRecoveryTips("achievements.combat-power", "历史记录待核对") : []]);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "战力成就",
			content: md,
			footer: footer.length > 0 ? footer : void 0
		}));
	} catch (error) {
		logger.error("查询战力成就失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询战力成就失败，请稍后再试。");
		appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.combat-power", "查询战力成就失败，请稍后再试。"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };