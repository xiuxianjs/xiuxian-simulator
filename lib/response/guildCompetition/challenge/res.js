import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { competitionChallengeArguments, parseRobotCompetitionChallenge } from "../../../api/bot/competition-challenge-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/challenge/res.ts
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
			title: "",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.challenge", competitionChallengeArguments(e.MessageText ?? ""), parseRobotCompetitionChallenge, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "挑战失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	if (loaded.data.outcome === "usage") {
		await sendFailure("指令格式：/挑战宗门 [宗门ID]");
		return;
	}
	const battleLogId = loaded.data.battleLogId;
	const footer = [];
	if (battleLogId) footer.push({
		label: "文字记录",
		command: `/查看战斗过程 ${battleLogId}`
	});
	footer.push({
		label: "挑战列表",
		command: "/可挑战宗门列表"
	});
	const md = Format.createMarkdown();
	md.addText(loaded.data.message);
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "宗门大比 - 挑战",
		header: [{
			label: "返回",
			command: "/宗门大比"
		}, {
			label: "参与挑战",
			command: "/可挑战宗门列表"
		}],
		content: md,
		footer
	}, [{ id: battleLogId }]));
});

//#endregion
export { res_default as default };