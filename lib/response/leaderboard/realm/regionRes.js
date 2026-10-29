import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseRobotRegionalRealmRanking } from "../../../api/bot/realm-ranking-queries.js";
import { leaderboardRecoveryTips } from "../../leaderboardRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { rankingFailureMarkdown, rankingFeedbackMarkdown, rankingSelfText, rankingView } from "../view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/leaderboard/realm/regionRes.ts
/**
* 区境界排行榜
* 指令：/区境界排行榜 [页码]
* 在同 region 的玩家中，按境界等级降序、修为降序排名，前50名
*/
var regionRes_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const msg = e.MessageText ?? "";
	const match = msg.match(/^(!|！|\/|#|＃)?区境界排行榜(?:\s*(\d+|榜首|附近|我的))?$/);
	const [, next] = useEvent();
	let response;
	try {
		response = await runRobotBusiness(e, "leaderboard.realm-region", {}, parseRobotRegionalRealmRanking, next, adviceRenderer(async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: rankingFeedbackMarkdown(reply),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
	} catch {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "区境界排行榜",
			content: rankingFailureMarkdown("leaderboard.realm-region", "查看区境界排行榜失败，请稍后再试")
		}));
		return;
	}
	if (response.handled) return;
	const result = { data: response.data };
	const currentUid = e.uid;
	const pageRaw = match?.[2];
	let page = pageRaw ? Number(pageRaw) : 1;
	if (!Number.isFinite(page) || page < 1) page = 1;
	const list = result.data.list.filter((row) => row.rank <= 50).slice(0, 50);
	const view = rankingView(msg);
	const total = list.length;
	const totalPages = Math.max(1, Math.ceil(total / 10));
	page = Math.min(view.page, totalPages);
	const slice = list.slice((page - 1) * 10, page * 10);
	const md = Format.createMarkdown();
	const selfText = rankingSelfText(result.data.self);
	if (selfText) {
		md.addText(selfText);
		md.addNewline();
	}
	if (slice.length === 0) {
		md.addText("当前区内暂无排行数据");
		appendMiddlewareAdvice(md, leaderboardRecoveryTips("leaderboard.realm-region", "暂无排行数据"));
	} else for (const item of slice) {
		const icon = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `【${item.rank}】`;
		const btns = [{
			label: "查看",
			command: `/查看信息 ${item.uid}`
		}];
		if (result.data.canUseSpar && currentUid !== item.uid) btns.push({
			label: "比试",
			command: `/比试 ${item.uid}`
		});
		if (currentUid && currentUid !== item.uid) btns.push({
			label: "点赞",
			command: `/点赞人气 ${item.uid} regionRealm`
		});
		md.addBlockquote(createQuoteMarkdown([`${icon} ${item.name}${item.uid === currentUid ? " 👈我" : ""}  ${item.realmName}`, `ID:${item.uid} 修为:${item.experience.toLocaleString()}`], btns));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "区境界排行榜",
		content: md,
		header: [{
			label: "全服",
			command: "/境界排行榜"
		}, {
			label: "本区",
			selected: true,
			command: "/区境界排行榜"
		}],
		nav: totalPages > 1 ? {
			current: page,
			total: totalPages,
			count: total,
			command: "/区境界排行榜 {page}"
		} : void 0
	}));
});

//#endregion
export { regionRes_default as default };