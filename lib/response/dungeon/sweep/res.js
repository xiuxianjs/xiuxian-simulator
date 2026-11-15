import { FormatGui } from "../../../utils/messageHelper.js";
import { buildBubble } from "../../presentation/bubble.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendTreasureEffects } from "../../treasureEffects.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { checkEncounterAfterPanel } from "../../onlineEncounter/afterPanel.js";
import { dungeonSweepArguments, parseRobotDungeonFreeSweep, parseRobotDungeonSweep } from "../../../api/bot/dungeon-sweep-robot-query.js";
import { freeSweepSections } from "./freeView.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/dungeon/sweep/res.ts
/**
* 秘境扫荡指令
* 指令格式：/扫荡秘境 秘境名称  或  /扫荡秘境 秘境名称 5  或  /扫荡秘境 秘境名称 10
* 已成功通关的秘境可扫荡，跳过战斗直接发奖
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const cleaned = (e.MessageText || "").trim().replace(/^(!|！|\/|#|＃)?\s*/, "");
	const [, next] = useEvent();
	const free = cleaned === "扫荡免费秘境";
	const sendFailure = async (reply) => {
		const md = Format.createMarkdown().addText(reply.text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: free ? "秘境免费扫荡" : "秘境扫荡",
			content: md,
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	};
	if (cleaned === "扫荡免费秘境") {
		const loaded = await runRobotBusiness(e, "dungeon.sweep-free", {}, parseRobotDungeonFreeSweep, next, sendFailure).catch(async () => {
			await sendFailure({
				text: "秘境扫荡结果暂不可确认，请查看秘境。",
				buttons: [{
					label: "查看秘境",
					command: "/查看秘境"
				}]
			});
			return { handled: true };
		});
		if (loaded.handled) return;
		const data = loaded.data;
		const footer = [{
			label: "查看秘境",
			command: "/查看秘境"
		}, ...data.skippedDungeons.length ? [] : [{
			label: "再次结算",
			command: "/扫荡免费秘境"
		}]];
		const sent = message.send(buildBubble({
			isPrivate,
			bid,
			title: "秘境免费扫荡",
			sections: freeSweepSections(data),
			footer
		}));
		if (data.totalTimes > 0) await checkEncounterAfterPanel(e, "dungeon-sweep", message, sent);
		return;
	}
	const sweepArgs = dungeonSweepArguments(e.MessageText || "");
	const loaded = await runRobotBusiness(e, "dungeon.sweep", sweepArgs, parseRobotDungeonSweep, next, sendFailure).catch(async () => {
		await sendFailure({
			text: "秘境扫荡结果暂不可确认，请查看秘境。",
			buttons: []
		});
		return { handled: true };
	});
	if (loaded.handled || loaded.data.outcome === "no_match") return;
	const { data: d, dungeonId } = loaded.data;
	const partial = typeof sweepArgs.times === "number" && d.times < sweepArgs.times;
	const contentMd = Format.createMarkdown();
	contentMd.addText(`${d.dungeonName} × ${d.times} | 精力 -${d.totalSpiritCost} | 修为 +${d.totalExp}`);
	if (d.experienceBonusText?.trim()) contentMd.addNewline().addText("其中：" + d.experienceBonusText);
	contentMd.addNewline();
	if (d.totalCurrencyText) {
		contentMd.addText(d.totalCurrencyText);
		contentMd.addNewline();
	}
	if (d.totalItemsText) {
		contentMd.addText("掉落：");
		contentMd.addText(d.totalItemsText);
		contentMd.addNewline();
	}
	appendTreasureEffects(contentMd, d.treasureEffects);
	contentMd.addNewline();
	contentMd.addNewline();
	if (partial) {
		contentMd.addText(`本次实际完成 ${d.times}/${sweepArgs.times} 次，以上为已结算的实际消耗与奖励。`);
		appendMiddlewareAdvice(contentMd, withBusinessRecovery("dungeon.sweep", {
			title: "",
			heading: "",
			text: "本次扫荡未完成全部请求次数",
			buttons: [],
			advice: []
		}).advice);
	}
	const sent = message.send(FormatGui({
		isPrivate,
		bid,
		title: "秘境扫荡",
		header: [{
			label: "返回",
			command: "/查看秘境"
		}, {
			label: "副本",
			command: "/查看主线"
		}],
		content: contentMd,
		footer: [...!partial && dungeonId && [
			1,
			5,
			10
		].includes(d.times) ? [{
			label: "继续扫荡",
			command: `/扫荡秘境 #${dungeonId} ${d.times}`
		}] : [], {
			label: "秘境列表",
			command: "/查看秘境"
		}]
	}));
	if (d.times > 0) await checkEncounterAfterPanel(e, "dungeon-sweep", message, sent);
});

//#endregion
export { res_default as default };