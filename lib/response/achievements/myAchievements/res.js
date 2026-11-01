import { formatGameTime } from "../../../utils/gameTime.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseCommandPage } from "../../../utils/commandPage.js";
import { achievementRecoveryTips } from "../../achievementRecovery.js";
import { selects } from "../../config.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import App from "../../../response-apps/achievements/myAchievements/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/achievements/myAchievements/res.ts
/**
* 我的成就功能
* 支持分页查询用户获得的成就记录
* 指令格式：/我的成就 [页数]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const page = parseCommandPage(e.MessageText, "我的成就");
		const result = await App({
			event: e,
			next,
			page,
			pageSize: 5
		});
		if (!result) return;
		if (result.code === "LOCKED") {
			sendFifthLayerLockedPage({
				bid,
				isPrivate,
				message,
				title: "我的成就",
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
				title: "我的成就",
				content: md
			}));
			return;
		}
		if (result.code !== "OK") {
			md.addText("查询成就记录失败，请稍后再试。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.completed", "查询成就记录失败，请稍后再试。"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "我的成就",
				content: md
			}));
			return;
		}
		const { items, page: pageData } = result.data;
		if (pageData.total === 0) {
			md.addText("您还没有获得任何成就。");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.completed", "您还没有获得任何成就。"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "我的成就",
				content: md
			}));
			return;
		}
		if (pageData.currentPage > pageData.totalPages) {
			md.addText(`页数超出范围，您共有 ${pageData.total} 个成就，总共 ${pageData.totalPages} 页。`);
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.completed", "页数超出"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "我的成就",
				content: md
			}));
			return;
		}
		if (!items.length) {
			md.addText("本页暂无成就记录");
			appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.completed", "本页无记录"));
		}
		for (const item of items) md.addBlockquote(createQuoteMarkdown([
			item.name,
			item.description,
			...item.completedAt ? [`完成：${formatGameTime(item.completedAt)}`] : []
		].filter(Boolean)));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的成就",
			content: md,
			nav: {
				current: pageData.currentPage,
				total: pageData.totalPages,
				count: pageData.total,
				command: "/我的成就 {page}"
			}
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("查询成就记录失败，请稍后再试。");
		appendMiddlewareAdvice(md, achievementRecoveryTips("achievements.completed", "查询成就记录失败，请稍后再试。"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的成就",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };