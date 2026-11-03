import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendTreasureEffects } from "../../treasureEffects.js";
import { parseRobotTowerChallenge, rankingChallengeArgument } from "../../../api/bot/ranking-robot-query.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/ranking/challengeRank/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "ranking.challenge", { rankArg: rankingChallengeArgument(e.MessageText || "") }, parseRobotTowerChallenge, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "挑战排名失败，请稍后再试")
		}));
		return;
	}
	const md = Format.createMarkdown();
	if (result.code === "PARAM_ERROR") {
		md.addText("请输入正确的格式：/挑战排名 [排名]");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const data = result.data;
	const experienceText = data.normalExperienceGained === void 0 ? `${data.experienceGained}${data.experienceBonusText}` : String(data.normalExperienceGained);
	md.addBold(data.battle.winner === "A" ? "挑战成功！" : "挑战失败").addNewline();
	md.addText(data.message).addNewline();
	md.addText(`修为 +${experienceText}  声望 +${data.reputationGained}`).addNewline();
	md.addText(`总回合数：${data.battle.rounds}；胜利方：${data.battle.winner === "A" ? "你方" : "对方"}`);
	appendTreasureEffects(md, data.treasureEffects);
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [
			...data.logId ? [{
				label: "文字记录",
				command: `/查看战斗过程 ${data.logId}`
			}] : [],
			{
				label: "通天塔",
				command: "/通天塔"
			},
			{
				label: "首通奖励",
				command: "/首通排名奖励"
			}
		]
	}, [{ id: data.logId }]));
});

//#endregion
export { res_default as default };