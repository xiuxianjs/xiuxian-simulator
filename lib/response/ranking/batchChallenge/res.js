import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotTowerBatch } from "../../../api/bot/ranking-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendBattleResult } from "../../../utils/battleMemoryMessage.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/ranking/batchChallenge/res.ts
/**
* 一键挑战 — 通天塔自动挑战5次
* 指令：/一键挑战
*
* 自动选择可挑战范围内排名最高的对手，连续挑战5次。
* 每次都切实执行战斗，根据胜负发放修为(+30)和声望奖励。
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "ranking.batch-challenge", {}, parseRobotTowerBatch, next, async (reply) => {
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
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "连续爬塔失败，请稍后再试")
		}));
		return;
	}
	const md = Format.createMarkdown();
	const data = result.data;
	md.addBold("通天塔 · 连续爬塔");
	md.addNewline();
	md.addNewline();
	for (const event of data.events) {
		md.addText(event.displayText);
		const btns = [];
		if (event.logId) btns.push({
			label: "文字记录",
			command: `/查看战斗过程 ${event.logId}`
		});
		if (event.needPotion) btns.push({
			label: "服用元力丹",
			command: "/服用 元力丹 3"
		});
		addOptions(md, btns);
	}
	md.addNewline();
	md.addText("━━ 战斗汇总 ━━");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`战绩：${data.winCount}胜 ${data.lossCount}负`));
	if (data.startRank !== data.finalRank) md.addBlockquote(Format.createMarkdown().addText(`排名：第${data.startRank}名 → 第${data.finalRank}名`));
	else md.addBlockquote(Format.createMarkdown().addText(`排名：第${data.finalRank}名（不变）`));
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`获得修为：+${data.experienceGained}${data.experienceBonusText}  声望：+${data.reputationGained}`));
	await sendBattleResult(message, {
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [
			{
				label: "连续爬",
				command: "/连续爬塔"
			},
			{
				label: "通天塔",
				command: "/通天塔"
			},
			{
				label: "首通奖",
				command: "/首通排名奖励"
			}
		]
	}, data.events.filter((event) => event.logId).map((event) => ({
		id: event.logId,
		label: `查看战斗回忆${event.index}`
	})));
});

//#endregion
export { res_default as default };