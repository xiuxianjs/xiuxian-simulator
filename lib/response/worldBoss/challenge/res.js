import { formatNumber } from "../../../utils/formatHelper.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendBattleResult } from "../../../utils/battleMemoryMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotWorldBossChallenge, worldBossChallengeArguments } from "../../../api/bot/world-boss-challenge-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/worldBoss/challenge/res.ts
/**
* 挑战凶兽指令
* 指令：#挑战凶兽
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
			title: "",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "world-boss.challenge", worldBossChallengeArguments(e.MessageText ?? ""), parseRobotWorldBossChallenge, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "挑战凶兽失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	if (loaded.data.outcome === "usage") {
		await sendFailure("用法：/挑战凶兽 或 /挑战凶兽 全部");
		return;
	}
	const data = loaded.data.data;
	const lines = [];
	lines.push(`⚔️ ${data.bossTitle}·${data.bossName}`);
	if (data.batchMode && data.rounds) {
		lines.push(`本次连续挑战：${data.attemptsUsed} 次`);
		lines.push(`本轮总伤害：${formatNumber(data.totalDamageDealt)}`);
		data.rounds.forEach((round, index) => {
			lines.push(`第${index + 1}次：伤害 ${formatNumber(round.damageDealt)}｜累计 ${formatNumber(round.totalPlayerDamage)}｜次数 ${round.attackCount}`);
		});
		lines.push(`剩余次数：${data.remainingAttempts}`);
	} else {
		lines.push(`本次伤害：${formatNumber(data.damageDealt)}`);
		lines.push(`累计伤害：${formatNumber(data.totalPlayerDamage)}`);
		lines.push(`攻击次数：${data.attackCount}`);
		lines.push(`剩余次数：${data.remainingAttempts}`);
	}
	if (data.stopReason) lines.push("后续挑战已停止");
	if (data.rank) lines.push(`当前排名：第 ${data.rank} 名`);
	const md = Format.createMarkdown();
	md.addText(lines.join("\n"));
	md.addNewline();
	md.addText("战斗结果");
	md.addNewline();
	const summary = data.battleSummary;
	const isTeamBattle = summary.sideACount > 1 || summary.sideBCount > 1;
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`战斗类型：${summary.sideACount}v${summary.sideBCount}${isTeamBattle ? " （队伍战）" : ""}`).addNewline().addText(`胜利方：${data.battle.winner === "A" ? "你方" : data.battle.winner === "B" ? "对方" : "平局"}`).addNewline().addText(`总回合数：${data.battle.totalRounds}`));
	md.addNewline();
	const footer = [];
	if (data.batchMode && data.rounds) for (const [index, round] of data.rounds.slice(0, 3).entries()) footer.push({
		label: `文字记录${index + 1}`,
		command: `/查看战斗过程 ${round.logId}`
	});
	else footer.push({
		label: "文字记录",
		command: `/查看战斗过程 ${data.logId}`
	});
	if (data.remainingAttempts > 0) {
		md.addNewline();
		footer.push({
			label: "继续挑战",
			command: "/挑战凶兽"
		});
		footer.push({
			label: "打完剩余",
			command: "/挑战凶兽 全部"
		});
	}
	md.addNewline();
	footer.push({
		label: "凶兽信息",
		command: "/凶兽"
	});
	footer.push({
		label: "凶兽排行",
		command: "/凶兽排行"
	});
	await sendBattleResult(message, {
		isPrivate,
		bid,
		title: `挑战凶兽 · ${data.stageName}`,
		header: [{
			label: "返回",
			command: "/凶兽"
		}],
		content: md,
		footer
	}, data.batchMode && data.rounds ? data.rounds.map((round, index) => ({
		id: round.logId,
		label: `查看战斗回忆${index + 1}`
	})) : [{ id: data.logId }]);
});

//#endregion
export { res_default as default };