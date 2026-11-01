import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { demonTowerChallengeArguments, parseRobotDemonTowerChallenge } from "../../../api/bot/demon-tower-challenge-robot-query.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/demonTower/challenge/res.ts
/**
* 妖塔挑战指令
* 指令：#妖塔挑战 <星级>
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const args = demonTowerChallengeArguments(e.MessageText || "");
	const invalidStar = args.stars !== null && (args.stars < 1 || args.stars > 3);
	const sendFailure = async (text) => {
		const md = Format.createMarkdown().addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: invalidStar ? "" : "妖塔挑战",
			content: md,
			footer: []
		}));
	};
	const loaded = await runRobotBusiness(e, "demon-tower.challenge", args, parseRobotDemonTowerChallenge, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "妖塔挑战失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	if (result.outcome === "usage") {
		const md = Format.createMarkdown();
		md.addText("请指定挑战星级：妖塔挑战 1/2/3");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const d = result.data;
	const displayLayer = d.success ? d.layerCleared ? d.nextLayer - 1 : d.nextLayer : d.nextLayer;
	const displayStage = d.success ? d.layerCleared ? 3 : d.nextStage - 1 : d.nextStage;
	const lines = [];
	if (d.success) {
		lines.push(`✦ 第 ${displayLayer} 层第 ${displayStage} 关 · 挑战成功！`);
		lines.push(`获得 ${d.starsEarned}🌟`);
		lines.push(`条件「${d.conditionLabel}」✓`);
		lines.push(`本关积分：+${d.scoreEarned}`);
		lines.push(`总积分：${d.totalTowerScore}`);
		lines.push(`累计星数：${d.cumulativeStars}🌟`);
		if (d.spiritStoneEarned > 0) lines.push(`通层奖励：+${d.spiritStoneEarned} 灵石`);
		if (d.milestonesTriggered.length > 0) lines.push(`里程碑达成：${d.milestonesTriggered.map((item) => `${item.stars}🌟→+${item.score}`).join("、")}`);
		if (d.allCleared) {
			lines.push("");
			lines.push("🎉 恭喜！全塔通关！");
		} else if (d.needSelectBuff) {
			lines.push("");
			lines.push("通层成功！请选择层间 Buff：");
			for (const buff of d.availableBuffs) lines.push(`  · ${buff.label}（需 ${buff.minStars}🌟）→ /妖塔选buff ${buff.cnKey} [次数]`);
		} else lines.push(`下一关：第 ${d.nextLayer} 层第 ${d.nextStage} 关`);
	} else {
		lines.push(`✗ 第 ${d.nextLayer} 层第 ${d.nextStage} 关 · 挑战失败！`);
		lines.push(d.battleWinner === "A" ? `未满足三星条件「${d.conditionLabel}」，今日闯塔结束` : "战斗落败，今日闯塔结束");
		lines.push(`本次到达：第 ${d.nextLayer} 层 | 累计 ${d.cumulativeStars}🌟 | 总积分：${d.totalTowerScore}`);
	}
	lines.push(`战斗结果：${d.battleWinner === "A" ? "你方胜利" : d.battleWinner === "B" ? "对方胜利" : "平局"}，共 ${d.battleRounds} 回合`);
	const md = Format.createMarkdown();
	const footer = [];
	if (d.logId) footer.push({
		label: "文字记录",
		command: `/查看战斗过程 ${d.logId}`
	});
	md.addText(lines.join("\n"));
	if (d.needSelectBuff) for (const buff of d.availableBuffs) footer.push({
		label: buff.cnKey,
		command: `/妖塔选buff ${buff.cnKey} 1`
	});
	else if (d.success) {
		footer.push({
			label: "挑战1🌟",
			command: "/妖塔挑战 1"
		});
		footer.push({
			label: "挑战2🌟",
			command: "/妖塔挑战 2"
		});
		footer.push({
			label: "挑战3🌟",
			command: "/妖塔挑战 3"
		});
	}
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "妖塔挑战",
		header: [{
			label: "返回",
			command: "/妖塔"
		}],
		content: md,
		footer
	}, [{ id: d.logId }]));
});

//#endregion
export { res_default as default };