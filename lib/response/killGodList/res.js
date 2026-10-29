import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseBackendKillGodRanking } from "../../api/bot/shaqi-queries.js";
import { MSG_PVP } from "../../constants/messages.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/killGodList/res.ts
/**
* 杀神榜
* 指令：/杀神榜
*
* 展示煞气 ≥ 30 的玩家列表
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "杀神榜",
			content: md
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "pvp.kill-god-ranking", {}, parseBackendKillGodRanking, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch {
		await sendFailure("查看杀神榜失败，请稍后再试");
		return;
	}
	if (result.handled) return;
	const { list, shaQiInfo, robberyRemaining, robberyDailyMax, streakText, canClaimTitle } = result.data;
	const pkNavigation = [
		{
			label: "可打劫道友",
			command: "/可打劫道友"
		},
		{
			label: "争夺历史",
			command: "/争夺历史"
		},
		{
			label: "隐藏物品",
			command: "/隐藏物品"
		}
	];
	const md = Format.createMarkdown();
	if (shaQiInfo) {
		md.addText(`煞气：${shaQiInfo.shaQi} · 打劫剩余${robberyRemaining}/${robberyDailyMax}次`);
		md.addNewline();
	}
	if (streakText) md.addBlockquote(Format.createMarkdown().addText(streakText));
	if (list.length === 0) md.addText(MSG_PVP.KILL_GOD_EMPTY);
	for (const entry of list) md.addBlockquote(createQuoteMarkdown([`第${entry.rank}名 ${entry.name} · 煞气${entry.shaQi}`], [{
		label: "查看",
		command: `/查看信息 ${entry.uid}`
	}]));
	if (canClaimTitle) md.addBlockquote(createQuoteMarkdown(["「杀神」称号可领取"], [{
		label: "领取",
		command: "/领取杀神称号"
	}]));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "杀神榜",
		header: [{
			label: "悬赏榜",
			command: "/悬赏榜"
		}, ...pkNavigation],
		footer: [
			{
				label: "打劫记录",
				command: "/打劫记录"
			},
			{
				label: "仇人",
				command: "/仇人"
			},
			{
				label: "煞气",
				command: "/煞气"
			}
		],
		content: md
	}));
});

//#endregion
export { res_default as default };