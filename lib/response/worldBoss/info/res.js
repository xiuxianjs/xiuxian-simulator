import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotWorldBossInfo } from "../../../api/bot/world-boss-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/worldBoss/info/res.ts
/**
* 凶兽信息指令
* 指令：#凶兽
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
	const loaded = await runRobotBusiness(e, "world-boss.info", {}, parseRobotWorldBossInfo, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async () => {
		await sendFailure("查询凶兽信息失败，请稍后再试。");
		return { handled: true };
	});
	if (loaded.handled) return;
	const md = Format.createMarkdown();
	const info = loaded.data;
	md.addText(`🐉 ${info.bossTitle}·${info.bossName}`);
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`境界档：${info.stageName}`).addNewline().addText(`活动时间：${info.activeTimeDesc}`));
	if (info.isActive) md.addBlockquote(Format.createMarkdown().addText("状态：🟢 活动进行中"));
	else md.addBlockquote(Format.createMarkdown().addText("状态：🔴 未开放"));
	md.addNewline();
	md.addNewline();
	md.addText("【凶兽情报】");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`凶兽生命：${info.bossHp}`).addNewline().addText(`每日挑战次数：${info.dailyAttempts} 次`).addNewline().addText(`战斗回合数：${info.maxRounds} 回合`));
	if (info.hasInstance) {
		md.addNewline();
		md.addText("【今日战况】");
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`全服总伤害：${info.totalDamage}`).addNewline().addText(`全服总攻击次数：${info.totalAttacks}`).addNewline().addText(`我的伤害：${info.playerDamage}`).addNewline().addText(`我的攻击次数：${info.playerAttacks}`).addNewline().addText(`剩余挑战次数：${info.remainingAttempts} / ${info.dailyAttempts}`));
		if (info.playerRank) md.addBlockquote(Format.createMarkdown().addText(`当前排名：第 ${info.playerRank} 名`));
		if (info.claimableRewardCount > 0) md.addBlockquote(Format.createMarkdown().addText(`可领取奖励：${info.claimableRewardCount} 份`));
		else if (info.rewardPendingUntilEnd) md.addBlockquote(Format.createMarkdown().addText("奖励提醒：你已造成伤害，需待本期活动结束后领取"));
	} else {
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText("今日凶兽尚未出现（首位挑战者将唤醒凶兽）").addNewline().addText(`剩余挑战次数：${info.remainingAttempts} / ${info.dailyAttempts}`));
	}
	const footer = [];
	md.addNewline();
	if (info.isActive && info.remainingAttempts > 0) {
		footer.push({
			label: "挑战凶兽",
			command: "/挑战凶兽"
		});
		if (info.remainingAttempts > 1) footer.push({
			label: "打完剩余",
			command: "/挑战凶兽 全部"
		});
	}
	footer.push({
		label: "凶兽排行",
		command: "/凶兽排行"
	});
	footer.push({
		label: "凶兽奖励",
		command: "/凶兽奖励"
	});
	if (info.claimableRewardCount > 0) footer.push({
		label: "领取凶兽奖励",
		command: "/领取凶兽奖励"
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "世界凶兽",
		header: [
			{
				label: "主线",
				command: "/查看主线"
			},
			{
				label: "秘境",
				command: "/查看秘境"
			},
			{
				label: "妖塔",
				command: "/妖塔"
			}
		],
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };