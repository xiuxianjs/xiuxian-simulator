import { formatNumber } from "../../../utils/formatHelper.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { leaderboardRecoveryTips } from "../../leaderboardRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotAlchemyLeaderboard } from "../../../api/bot/alchemy-robot-query.js";
import { rankingFailureMarkdown, rankingFeedbackMarkdown, rankingSelfText, rankingView } from "../../leaderboard/view.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/alchemy/leaderboard/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "leaderboard.alchemy", {
			page: String(rankingView(e.MessageText ?? "").page),
			top50: true
		}, parseRobotAlchemyLeaderboard, next, adviceRenderer(async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: rankingFeedbackMarkdown(reply),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (response.handled) return;
		const result = response.data;
		const md = Format.createMarkdown();
		const items = result.items.filter((row) => row.rank <= 50).slice(0, 10);
		const selfText = rankingSelfText(result.self);
		if (selfText) {
			md.addText(selfText);
			md.addNewline();
		}
		if (items.length === 0) {
			md.addText("暂无丹师排行数据");
			appendMiddlewareAdvice(md, leaderboardRecoveryTips("leaderboard.alchemy", "暂无排行数据"));
		} else for (const item of items) {
			const icon = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `【${item.rank}】`;
			const btns = [{
				label: "查看",
				command: `/查看信息 ${item.uid}`
			}];
			if (item.canLike) btns.push({
				label: "点赞",
				command: `/点赞人气 ${item.uid} alchemy`
			});
			const detail = `ID:${item.uid} Lv.${item.level} 经验:${formatNumber(item.exp)} 炼制:${formatNumber(item.totalCrafts)} 成功率:${item.successRate}%`;
			md.addBlockquote(createQuoteMarkdown([`${icon} ${item.name}  ${item.title}`, detail], btns));
		}
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "丹师排行榜",
			content: md,
			nav: result.page.total > 1 ? {
				current: result.page.current,
				total: result.page.total,
				count: result.total,
				command: "/丹师排行榜 {page}"
			} : void 0
		}));
	} catch (error) {
		logger.error("查询丹师排行榜失败:", error);
		const md = Format.createMarkdown();
		rankingFailureMarkdown("leaderboard.alchemy", "查询丹师排行榜失败，请稍后再试", md);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "丹师排行榜",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };