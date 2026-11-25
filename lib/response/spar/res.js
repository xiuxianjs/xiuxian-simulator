import { trackSpar } from "../../analytics/index.js";
import { commandText } from "../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { appendTreasureEffects } from "../treasureEffects.js";
import { parseRobotSpar } from "../../api/bot/spar.js";
import { BattleFormatGui } from "../../utils/battleMemoryMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseTargetSuggestions, targetSuggestionsBubble } from "../targetSuggestions.js";
import { fishingBlessingSuffix } from "../fishing/blessingNote.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/spar/res.ts
/**
* 比试
* 指令：比试 [玩家UID/@目标]
*
* 消耗：10 元力/次
* 每日上限：10 次
* 奖励：胜利获得 14 修为，失败获得 10 修为；每次获得 1 点熟练点
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const batch = /^[/!！#＃]?十连比试(?:\s|$)/.test(e.MessageText.trim());
	const command = batch ? "十连比试" : "比试";
	let UID = 0;
	let targetBid;
	const [mention] = useMention();
	const uidMatch = e.MessageText.match(/(\d+)/);
	if (uidMatch) UID = Number(uidMatch[1]);
	else {
		const user = await mention.findOne();
		if (user.data && user.count) targetBid = user.data.UserId;
	}
	const [, next] = useEvent();
	const sendFailure = async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: Format.createMarkdown().addText(reply.text),
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "pvp.spar", {
			targetUid: Number.isFinite(UID) ? String(UID) : null,
			targetBid: targetBid ?? null,
			suggestTargets: true,
			...batch ? { batch: true } : {}
		}, (data) => parseTargetSuggestions(data, parseRobotSpar), next, async (reply) => {
			await sendFailure(reply);
		});
	} catch (error) {
		await sendFailure({
			title: "",
			text: `比试失败：${error instanceof Error ? error.message : "未知错误"}`,
			buttons: []
		});
		return;
	}
	if (result.handled) return;
	if (result.data.mode === "suggestions") {
		await message.send(targetSuggestionsBubble(e, command, result.data.ids, result.data.reason));
		return;
	}
	const data = result.data.result;
	const { winner, totalRounds, totalWaves } = data.battleResult;
	trackSpar(e.uid, winner === "A" ? "success" : winner === "B" ? "fail" : "draw", {
		targetId: data.targetUid,
		totalRounds,
		totalWaves,
		settledCount: data.settledCount
	});
	UID = data.targetUid;
	const mdStart = Format.createMarkdown();
	mdStart.addText("比试开始...");
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: mdStart
	}));
	const md = Format.createMarkdown();
	const sideACount = data.battleResult.finalState.sideA.length;
	const sideBCount = data.battleResult.finalState.sideB.length;
	const isTeamBattle = sideACount > 1 || sideBCount > 1;
	const showWave = data.battleResult.totalWaves > 1;
	md.addText(`${command}结果`);
	if (batch) {
		md.addNewline();
		md.addText(`实际结算：${data.settledCount}次（共用一场战斗结果）`);
	}
	md.addNewline();
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`战斗类型：${sideACount}v${sideBCount}${isTeamBattle ? " （队伍战）" : ""}`).addNewline().addText(`胜利方：${data.battleResult.winner === "A" ? "你方" : data.battleResult.winner === "B" ? "对方" : "平局"}`).addNewline().addText(`总回合数：${data.battleResult.totalRounds}`));
	if (showWave) md.addBlockquote(Format.createMarkdown().addText(`总波次：${data.battleResult.totalWaves}`));
	md.addBlockquote(Format.createMarkdown().addText(`消耗元力：${data.hpCost}`).addNewline().addText(`今日次数：${data.newCount}/${data.dailyMax}`));
	const experienceText = `${data.normalExperienceGained ?? (batch ? data.experience : data.expGain)}${data.normalExperienceGained !== void 0 || batch ? fishingBlessingSuffix(data.expBonusText) : data.expBonusText}`;
	md.addBlockquote(Format.createMarkdown().addText(`修为获得：+${experienceText}`));
	appendTreasureEffects(md, data.treasureEffects);
	md.addNewline();
	if (data.proficiencyResult?.gained) {
		md.addNewline();
		md.addText(`📖 比试参悟，获得 ${data.proficiencyResult.points} 点熟练点`);
		md.addText(" ");
		md.addButton(markdownButtonLabel("功法"), { data: commandText("我的功法") });
		md.addNewline();
	}
	await message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "文字记录",
			command: `/查看战斗过程 ${data.logId}`
		}, {
			label: batch ? "继续十连" : "继续比试",
			command: `/${command} ${UID}`
		}]
	}, [{ id: data.logId }]));
});

//#endregion
export { res_default as default };