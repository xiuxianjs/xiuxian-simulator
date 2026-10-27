import { formatGameTime } from "../../../utils/gameTime.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { parseCompetitionBattleDetail } from "../../../api/bot/competition-read-projections.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/battleDetail/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").trim().replace(/^(!|！|\/|#|＃)?\s*/, "").match(/^宗门大比战斗详情\s+(\d+)$/);
	if (!match) return;
	const battleId = Number(match[1]);
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.battle-detail", { battleIdText: String(battleId) }, parseCompetitionBattleDetail, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "获取战斗详情失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const { stageName, battleTime, attackerName, defenderName, winnerName, isWin, battleLogId } = { data: loaded.data }.data;
	const md = Format.createMarkdown();
	md.addBlockquote(Format.createMarkdown().addText(`记录ID：${battleId}`).addNewline().addText(`阶段：${stageName}`).addNewline().addText(`时间：${formatGameTime(battleTime)}`).addNewline().addText(`对阵：${attackerName} VS ${defenderName}`).addNewline().addText(`结果：${isWin ? "✅ 胜利" : "❌ 失败"}（胜者：${winnerName}）`));
	const footer = [];
	md.addNewline();
	if (battleLogId) footer.push({
		label: "文字记录",
		command: `/查看战斗过程 ${battleLogId}`
	});
	footer.push({
		label: "返回列表",
		command: "/宗门大比战斗记录 1"
	});
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "宗门大比 - 战斗详情",
		header: [{
			label: "返回",
			command: "/宗门大比"
		}, {
			label: "战斗记录",
			command: "/宗门大比战斗记录 1"
		}],
		content: md,
		footer
	}, [{ id: battleLogId }]));
});

//#endregion
export { res_default as default };