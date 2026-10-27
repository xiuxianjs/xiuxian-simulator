import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseDemonTowerInfo } from "../../../api/bot/demon-tower-info-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/demonTower/info/res.ts
/**
* 妖塔信息指令
* 指令：#妖塔
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const loaded = await runRobotBusiness(e, "demon-tower.info", {}, parseDemonTowerInfo, next);
	if (loaded.handled) return;
	const result = loaded.data;
	if (!result.access.ok || !result.info) {
		const md = Format.createMarkdown();
		md.addText(`筑基及以上方可开启妖塔，当前境界：${result.access.realmName}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "妖塔",
			content: md,
			footer: [{
				label: "我的境界",
				command: "/我的境界"
			}]
		}));
		return;
	}
	const d = result.info;
	const md = Format.createMarkdown();
	if (!d.hasStarted) {
		md.addBlockquote(Format.createMarkdown().addText("今日尚未开始闯塔").addNewline().addText(`可扫荡层数：${d.sweepableLayersText}`).addNewline().addText(`你的战力✊${d.userPower}`).addNewline().addText(`第${d.targetLayer}层：1🌟✊${d.monsterPower.star1} 、 2🌟✊${d.monsterPower.star2} 、 3🌟✊${d.monsterPower.star3}`));
		if (d.showSweepButton) md.addBlockquote(Format.createMarkdown().addText(`使用「妖塔扫荡」可快速跳过前 ${d.sweepableLayers} 层`));
	} else if (d.isFinished) md.addBlockquote(Format.createMarkdown().addText("今日闯塔已结束").addNewline().addText(`最终进度：第 ${d.currentLayer} 层 第 ${d.currentStage} 关`).addNewline().addText(`累计星数：${d.cumulativeStars}🌟`).addNewline().addText(`获得积分：${d.totalScore} | 获得灵石：${d.totalSpiritStone}`).addNewline().addText(`你的战力✊${d.userPower}`));
	else {
		md.addBlockquote(Format.createMarkdown().addText(`当前进度：第 ${d.currentLayer} 层 第 ${d.currentStage} 关`).addNewline().addText(`本层星数：${d.currentLayerStars}🌟 / 9🌟`).addNewline().addText(`累计星数：${d.cumulativeStars}🌟`).addNewline().addText(`已获积分：${d.totalScore} | 已获灵石：${d.totalSpiritStone}`));
		md.addBlockquote(Format.createMarkdown().addText(`你的战力✊${d.userPower}`).addNewline().addText(`第${d.targetLayer}层怪物战力`).addNewline().addText(`1🌟✊${d.monsterPower.star1}、2🌟✊${d.monsterPower.star2}、3🌟✊${d.monsterPower.star3}`));
		md.addBlockquote(Format.createMarkdown().addText(`当前Buff：${d.buffText}`));
		md.addBlockquote(Format.createMarkdown().addText(`三星条件：${d.conditionLabel}`));
	}
	if (d.recordedLayers > 0) {
		md.addNewline();
		md.addText("── 历史最高 ──");
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`推进至第 ${d.maxRecordedLayer} 层`));
		md.addBlockquote(Format.createMarkdown().addText(`历史累计最高星数：${d.totalBestStars}🌟`).addNewline().addText(`满星层数：${d.fullStarLayers} / ${d.recordedLayers}`));
	}
	md.addBlockquote(Format.createMarkdown().addText(`里程碑：已领取 ${d.milestones.claimedCount} / ${d.milestones.totalCount}`));
	if (d.milestones.next) md.addBlockquote(Format.createMarkdown().addText(`下个里程碑：${d.milestones.next.stars}🌟 → +${d.milestones.next.score} 积分`));
	const challengeFooter = [];
	const actionFooter = [];
	if (d.showChallengeButtons) {
		challengeFooter.push({
			label: "挑战1🌟",
			command: "/妖塔挑战 1"
		});
		challengeFooter.push({
			label: "挑战2🌟",
			command: "/妖塔挑战 2"
		});
		challengeFooter.push({
			label: "挑战3🌟",
			command: "/妖塔挑战 3"
		});
	}
	if (d.showSweepButton) actionFooter.push({
		label: "一键扫荡",
		command: "/妖塔扫荡"
	});
	if (d.showResetButton) actionFooter.push({
		label: "重置",
		command: "/妖塔重置"
	});
	actionFooter.push({
		label: "排行",
		command: "/妖塔排行榜"
	});
	const footerRows = [];
	if (challengeFooter.length > 0 || actionFooter.length > 0) md.addNewline();
	if (challengeFooter.length > 0) footerRows.push(challengeFooter);
	if (actionFooter.length > 0) footerRows.push(actionFooter);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "妖塔",
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
				label: "凶兽",
				command: "/凶兽"
			}
		],
		content: md,
		footer: footerRows
	}));
});

//#endregion
export { res_default as default };