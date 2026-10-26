import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotTianjiaoLeaderboard } from "../../../api/bot/tianjiao-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/tianjiao/leaderboard/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "tianjiao.leaderboard", {}, parseRobotTianjiaoLeaderboard, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "登天梯查询失败")
		}));
		return;
	}
	const md = Format.createMarkdown();
	if (result.code === "LOCKED") {
		md.addText(result.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "我的活动",
				command: "/我的活动"
			}]
		}));
		return;
	}
	const myRankText = result.data.myRank ? `第${result.data.myRank}名` : "未入榜";
	const challengeStatus = !result.data.canChallenge ? `${result.data.requiredText}，当前仅可预览榜单与奖励` : result.data.attemptsLeft <= 0 ? "今日次数已用完" : "已开放";
	md.addText(`🏆 ${result.data.stageName}登天梯`);
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`我的排名：${myRankText}`).addNewline().addText(`今日剩余次数：${result.data.attemptsLeft}`).addNewline().addText(`挑战状态：${challengeStatus}`));
	result.data.entries.forEach((entry) => {
		md.addBlockquote(createQuoteMarkdown([entry.text], entry.challengeRank !== null ? [{
			label: entry.challengeLabel,
			command: `/登天挑战 ${entry.challengeRank}`
		}] : []));
		md.addNewline();
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [
			{
				label: "登天奖励",
				command: "/登天奖励"
			},
			{
				label: "我的活动",
				command: "/我的活动"
			},
			{
				label: "排行榜",
				command: "/排行榜"
			}
		]
	}));
});

//#endregion
export { res_default as default };