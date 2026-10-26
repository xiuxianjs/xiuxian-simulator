import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseSweep } from "../../../api/bot/demon-tower-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/demonTower/sweep/res.ts
/**
* 妖塔扫荡指令
* 指令：#妖塔扫荡
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown().addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "demon-tower.sweep", {}, parseSweep, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "妖塔扫荡失败，请稍后再试");
		return { handled: true };
	});
	if (loaded.handled) return;
	const d = loaded.data;
	const canBatchSelect = d.buffsToSelect > 1;
	const lines = [];
	lines.push(`一键扫荡完成！跳过前 ${d.layersSwept} 层`);
	lines.push("");
	lines.push(`获得灵石：+${d.totalSpiritStone}`);
	lines.push(`获得积分：+${d.totalScore}`);
	lines.push(`累计星数：${d.cumulativeStars}🌟`);
	if (d.milestonesTriggered.length > 0) {
		const msText = d.milestonesTriggered.map((m) => `${m.stars}🌟→+${m.score}`).join("、");
		lines.push(`里程碑达成：${msText}`);
	}
	lines.push("");
	if (d.nextLayer <= 60) {
		lines.push(`需要为 ${d.buffsToSelect} 层选择 Buff`);
		lines.push("需选择 " + d.buffsToSelect + " 次：");
		for (const buff of d.availableBuffs) lines.push(`  · ${buff.label} → /妖塔选buff ${buff.cnKey}`);
		lines.push("");
		lines.push(`选完 Buff 后从第 ${d.nextLayer} 层开始手动挑战`);
	} else lines.push("全塔已扫荡完毕！");
	const md = Format.createMarkdown();
	md.addBold("【妖塔扫荡】");
	md.addNewline();
	md.addText(lines.join("\n"));
	if (d.availableBuffs.length > 0) {
		const singleFooter = [];
		const footerRows = [];
		md.addNewline();
		for (const buff of d.availableBuffs) singleFooter.push({
			label: `${buff.cnKey}`,
			command: `/妖塔选buff ${buff.cnKey} 1`
		});
		footerRows.push(singleFooter);
		if (canBatchSelect) {
			const batchFooter = [];
			for (const buff of d.availableBuffs) batchFooter.push({
				label: `${buff.cnKey}x${d.buffsToSelect}`,
				command: `/妖塔选buff ${buff.cnKey} ${d.buffsToSelect}`
			});
			footerRows.push(batchFooter);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			content: md,
			footer: footerRows
		}));
	} else message.send(FormatGui({
		isPrivate,
		bid,
		content: md
	}));
});

//#endregion
export { res_default as default };