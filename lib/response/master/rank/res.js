import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterRanking } from "../../../api/bot/queries.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { rankingSelfText, rankingView } from "../../leaderboard/view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/rank/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "master.ranking", {}, parseMasterRanking, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch {
		const md = Format.createMarkdown().addText("获取圣人榜失败，请稍后重试");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.ranking", "获取圣人榜失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const uid = e.uid;
	const md = Format.createMarkdown();
	md.addBold("【圣人榜】");
	md.addNewline();
	const view = rankingView(e.MessageText ?? "");
	const totalPages = Math.max(1, Math.ceil(Math.min(50, result.top.length) / 10));
	const page = Math.min(view.page, totalPages);
	const list = result.top.filter((row) => row.rank <= 50).slice((page - 1) * 10, page * 10);
	const selfText = rankingSelfText(result.self);
	if (selfText) {
		md.addText(selfText);
		md.addNewline();
	}
	if (list.length === 0) {
		md.addText("当前暂无上榜修士");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.ranking", "暂无上榜修士"));
	} else {
		if (!selfText) {
			const status = result.self ? "本人排名未在当前展示范围内" : "本次未返回本人排名";
			md.addText(status).addNewline();
			appendMiddlewareAdvice(md, masterRecoveryTips("master.ranking", status));
		}
		list.forEach((row) => {
			md.addBlockquote(createQuoteMarkdown([`【${row.rank}】${row.userName}${row.userId === uid ? " 👈我" : ""}（${row.virtueTitle}）`, `ID:${row.userId} 师德${row.masterVirtueExp}，徒弟${row.totalGraduatedCount + row.activeDiscipleCount}人`], [{
				label: "查看",
				command: `/查看信息 ${row.userId}`
			}]));
		});
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "圣人榜",
		content: md,
		nav: totalPages > 1 ? {
			current: page,
			total: totalPages,
			count: Math.min(50, result.top.length),
			command: "/圣人排行榜 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };