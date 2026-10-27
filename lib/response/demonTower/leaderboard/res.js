import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendDemonTowerLockedPage } from "../access.js";
import { parseTowerRanking } from "../../../api/bot/tower-ranking-queries.js";
import { rankingSelfText, rankingView } from "../../leaderboard/view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/demonTower/leaderboard/res.ts
/**
* 妖塔排行榜
* 指令：/妖塔排行榜 [页码]
* 按历史累计最高🌟排名前50
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const msg = e.MessageText ?? "";
	const [, next] = useEvent();
	const loaded = await runRobotBusiness(e, "demon-tower.ranking", {
		pageText: String(rankingView(msg).page),
		top50: true
	}, parseTowerRanking, next);
	if (loaded.handled) return;
	const result = loaded.data;
	const currentUid = e.uid;
	if (!result.access.ok || !result.leaderboard) {
		sendDemonTowerLockedPage({
			bid,
			isPrivate,
			message,
			realmName: result.access.realmName ?? "未知",
			title: "妖塔排行榜"
		});
		return;
	}
	const d = result.leaderboard;
	const items = d.list.filter((row) => row.rank <= 50).slice(0, 10);
	const md = Format.createMarkdown();
	const selfText = rankingSelfText(d.self);
	if (selfText) {
		md.addText(selfText);
		md.addNewline();
	}
	if (items.length === 0) md.addText("暂无排行数据");
	else for (const item of items) {
		const icon = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `【${item.rank}】`;
		const btns = [{
			label: "查看",
			command: `/查看信息 ${item.playerId}`
		}];
		if (currentUid && currentUid !== item.playerId) btns.push({
			label: "点赞",
			command: `/点赞人气 ${item.playerId} demonTower`
		});
		md.addBlockquote(createQuoteMarkdown([`${icon} ${item.name}${item.playerId === currentUid ? " 👈我" : ""}`, `ID:${item.playerId} 星数:${item.totalStars} 最高层:${item.highestLayer}`], btns));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "妖塔排行榜",
		content: md,
		nav: d.totalPages > 1 ? {
			current: d.page,
			total: d.totalPages,
			count: d.total,
			command: "/妖塔排行榜 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };