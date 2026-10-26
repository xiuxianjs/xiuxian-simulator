import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { achievementRecoveryTips } from "../../achievementRecovery.js";
import { selects } from "../../config.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import App from "../../../response-apps/achievements/overview/app.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/achievements/overview/res.ts
/**
* 成就总览
* 指令：/成就、/我的成就
* 展示各成就分类的达成情况与入口
*/
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
			md.addText("查询成就失败，请稍后再试。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.overview", "查询成就失败，请稍后再试。"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const { access, summary, categories, canClaimAll } = result.data;
		if (!access.canUseFifthLayerFeature) {
			sendFifthLayerLockedPage({
				bid,
				isPrivate,
				message,
				title: "成就",
				realmName: access.realmName
			});
			return;
		}
		md.addText(`已达成：${summary.completedAchievements} / ${summary.totalAchievements}`);
		md.addNewline();
		md.addText(`完成率：${summary.completionRate}%`);
		md.addNewline();
		md.addNewline();
		const footer = [
			{
				label: "总览",
				selected: true,
				command: "/成就"
			},
			{
				label: "主线",
				command: "/成就 主线"
			},
			{
				label: "战力",
				command: "/成就 战力"
			},
			{
				label: "灵田",
				command: "/成就 灵田"
			},
			{
				label: "师门",
				command: "/成就 师门"
			}
		];
		if (categories.length === 0) {
			md.addText("当前暂无成就分类配置。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.overview", "当前暂无成就分类配置。"));
		} else {
			md.addText("分类进度");
			md.addNewline();
			for (const category of categories) md.addBlockquote(createQuoteMarkdown([`${category.label}成就 · ${category.completed}/${category.total}（${category.completionRate}%）`, ...category.hasClaimable ? [`待领取 ${category.claimableCount} 项`] : []], category.command ? [{
				label: "查看",
				command: category.command
			}] : []));
		}
		if (canClaimAll) footer.push({
			label: "一键领取",
			command: "/一键领取成就"
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "成就",
			content: md,
			footer
		}));
	} catch (error) {
		logger.error("查询成就总览失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询成就失败，请稍后再试。");
		appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.overview", "查询成就失败，请稍后再试。"));
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