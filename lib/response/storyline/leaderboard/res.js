import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { leaderboardRecoveryTips } from "../../leaderboardRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseStorylineRankingQuery } from "../../../api/bot/storyline-ranking-queries.js";
import { rankingFeedbackMarkdown, rankingSelfText } from "../../leaderboard/view.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storyline/leaderboard/res.ts
/**
* 主线排行榜
* 指令：/主线排行榜 [页码]
* 按历史累计最高🌟排名前50
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const msg = e.MessageText || "";
	const [, parentNext] = useEvent();
	const sendFailure = adviceRenderer(async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "主线排行榜",
			content: rankingFeedbackMarkdown(reply),
			footer: reply.buttons
		}));
	});
	const response = await runRobotBusiness(e, "leaderboard.storyline", {
		input: msg,
		top50: true
	}, (value) => {
		if (value && typeof value === "object" && "outcome" in value && value.outcome === "ignored") return { ignored: true };
		const query = parseStorylineRankingQuery(value);
		if (!query.leaderboard) throw new Error("查询接口资格与榜单不一致");
		return {
			ignored: false,
			data: query.leaderboard
		};
	}, parentNext, sendFailure).catch(async (error) => {
		logger.error("查询主线排行榜失败:", error);
		await sendFailure({
			title: "",
			heading: "",
			text: error instanceof Error ? error.message : "查询主线排行榜失败",
			buttons: [],
			advice: leaderboardRecoveryTips("leaderboard.storyline", "查询失败")
		});
		return { handled: true };
	});
	if (response.handled) return;
	if (response.data.ignored) {
		await sendFailure({
			title: "",
			heading: "",
			text: "页码无效，请从榜首重新查看。",
			buttons: [],
			advice: leaderboardRecoveryTips("leaderboard.storyline", "参数无效")
		});
		return;
	}
	const result = { data: response.data.data };
	const currentUid = e.uid;
	const md = Format.createMarkdown();
	const items = result.data.items.filter((row) => row.rank <= 50).slice(0, 10);
	const selfText = rankingSelfText(result.data.self);
	if (selfText) {
		md.addText(selfText);
		md.addNewline();
	}
	if (items.length === 0) {
		md.addText("暂无排行数据");
		appendMiddlewareAdvice(md, leaderboardRecoveryTips("leaderboard.storyline", "暂无排行数据"));
	} else for (const item of items) {
		const icon = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `【${item.rank}】`;
		const btns = [{
			label: "查看",
			command: `/查看信息 ${item.uid}`
		}];
		if (currentUid && currentUid !== item.uid) btns.push({
			label: "点赞",
			command: `/点赞人气 ${item.uid} storyline`
		});
		md.addBlockquote(createQuoteMarkdown([`${icon} ${item.name}${item.uid === currentUid ? " 👈我" : ""}`, `ID:${item.uid} 星数:${item.totalStars}`], btns));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "主线排行榜",
		content: md,
		nav: result.data.totalPages > 1 ? {
			current: result.data.page,
			total: result.data.totalPages,
			count: result.data.total,
			command: "/主线排行榜 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };