import { displayCurrencyText } from "../../../constants/currency.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { requestRobotBusiness } from "../../../api/bot/robot-business.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { finishRobotBusiness, runRobotBusiness } from "../../robotBusiness.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { parseStorylineChallengeBusiness, parseStorylineManualBattleState } from "../../../api/bot/storyline-manual-battle.js";
import { Format, onResponse, useEvent, useSubscribe } from "alemonjs";

//#region src/response/storyline/challenge/res.ts
const routeChoice = (text) => {
	return {
		普攻: "normal",
		普通攻击: "normal",
		战技: "battle",
		神通: "divine",
		自动: "自动",
		切换自动: "自动",
		逃跑: "逃跑"
	}[text.trim().replace(/^(!|！|\/|#|＃)?\s*/, "")] ?? null;
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [subscribe] = useSubscribe(selects);
	const bid = String(e?.UserId ?? "");
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	let started;
	try {
		const response = await runRobotBusiness(e, "storyline.challenge", { input: e.MessageText }, parseStorylineChallengeBusiness, parentNext, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		started = response.data;
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "主线挑战",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "主线挑战失败")
		}));
		return;
	}
	if (started.ignored) return;
	const render = async (state, sourceEvent = e, continueResponse = parentNext) => {
		const md = Format.createMarkdown();
		if (state.finished) {
			const settlement = state.settlement ?? {};
			const won = state.winner === "A";
			const stageLabel = typeof settlement.stageLabel === "string" ? settlement.stageLabel : "";
			const stars = typeof settlement.stars === "number" ? settlement.stars : 0;
			const exp = typeof settlement.experienceGained === "number" ? settlement.experienceGained : 0;
			const stones = typeof settlement.spiritStoneGained === "number" ? settlement.spiritStoneGained : 0;
			const spiritCost = typeof settlement.spiritCostPaid === "number" ? settlement.spiritCostPaid : 0;
			const monsterName = typeof settlement.monsterName === "string" ? settlement.monsterName : "";
			const drops = Array.isArray(settlement.drops) ? settlement.drops : [];
			const chapterNumber = typeof settlement.chapterNumber === "number" ? settlement.chapterNumber : 0;
			const stageNumber = typeof settlement.stageNumber === "number" ? settlement.stageNumber : 0;
			const topRowButtons = [];
			const actionRowButtons = [];
			if (settlement.teamId) {
				md.addNewline();
				md.addBlockquote(Format.createMarkdown().addText("📢 仅队长消耗精力与结算奖励，队友不消耗不结算"));
			}
			md.addNewline();
			const battleRounds = settlement.battle?.Rounds;
			const outcome = Format.createMarkdown().addText(`对手：${monsterName}`).addNewline().addText(`结果：${won ? "胜利" : "失败"}`);
			if (typeof battleRounds === "number") outcome.addNewline().addText(`回合数：${battleRounds}`);
			md.addBlockquote(outcome.addNewline().addText(`消耗精力：${spiritCost}`));
			if (won) {
				md.addBlockquote(Format.createMarkdown().addText(`星级评价：${"⭐".repeat(stars)}${"☆".repeat(Math.max(0, 3 - stars))}`).addNewline().addText(`修为获得：+${exp}${typeof settlement.expBonusText === "string" ? settlement.expBonusText : ""}`));
				if (stones > 0) md.addBlockquote(Format.createMarkdown().addText(`灵石获得：+${stones}`));
			}
			if (won && drops.length > 0) {
				md.addBlockquote(Format.createMarkdown().addText("额外掉落："));
				for (const value of drops) {
					const drop = value;
					if (typeof drop.amount === "number") {
						const line = Format.createMarkdown().addText(`${typeof drop.name === "string" ? displayCurrencyText(drop.name) : typeof drop.currencyCode === "string" ? displayCurrencyText(drop.currencyCode) : "奖励"}×${drop.amount} `);
						md.addBlockquote(typeof drop.itemId === "number" ? addOptions(line, [{
							label: "详情",
							command: `/物品详情 道具 ${drop.itemId}`
						}]) : line);
					}
				}
			}
			if (state.logId) topRowButtons.push({
				label: "文字记录",
				command: `/查看战斗过程 ${state.logId}`
			});
			if (chapterNumber > 0) topRowButtons.push({
				label: "打开章节",
				command: `/查看主线 ${chapterNumber}`
			});
			if (!won) appendMiddlewareAdvice(md, withBusinessRecovery("storyline.challenge", {
				title: "",
				heading: "",
				text: "战斗结果：未获胜",
				buttons: [],
				advice: []
			}).advice);
			if (chapterNumber > 0 && stageNumber > 0) {
				if (settlement.showPrevStage === true) actionRowButtons.push({
					label: "上一关",
					command: `/主线挑战 ${chapterNumber}-${stageNumber - 1}`
				});
				actionRowButtons.push({
					label: "再次挑战",
					command: `/主线挑战 ${chapterNumber}-${stageNumber}`
				});
				if (settlement.showNextStage === true) actionRowButtons.push({
					label: "下一关",
					command: `/主线挑战 ${chapterNumber}-${stageNumber + 1}`
				});
				else if (settlement.showNextChapter === true) actionRowButtons.push({
					label: "下一章",
					command: `/查看主线 ${chapterNumber + 1}`
				});
			}
			message.send(await BattleFormatGui({
				isPrivate,
				bid,
				title: `主线结算 ${stageLabel}`,
				content: md,
				footer: [topRowButtons, actionRowButtons].filter((row) => row.length > 0)
			}, [{ id: state.logId }]));
			return;
		}
		if (!state.choice) return;
		for (const event of state.events) {
			const row = event;
			if (row.actorName || row.skillName) md.addText(`${row.actorName ?? "单位"} 使用 ${row.skillName ?? "技能"}\n`);
		}
		md.addText(`第${state.choice.round}回合：${state.choice.unitName}请选择技能\n`);
		for (const skill of state.choice.availableSkills) md.addText(`${skill.available ? "✅" : "⬜"} ${skill.name || skill.type}${skill.reason ? `（${skill.reason}）` : ""}\n`);
		md.addText("回复：普攻 / 战技 / 神通 / 自动 / 逃跑");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "主线挑战",
			content: md
		}));
		let handled = false;
		let refresh;
		const schedulePoll = (delay) => {
			refresh = setTimeout(() => {
				pollSettlement();
			}, delay);
		};
		const pollSettlement = async () => {
			if (handled) return;
			try {
				const result = await requestRobotBusiness(sourceEvent, "storyline.state", { sessionId: state.sessionId }, parseStorylineManualBattleState);
				if (handled) return;
				if (!result.success || result.branch === "middleware") {
					handled = true;
					subscribe.cancel(subscription);
				}
				const response = await finishRobotBusiness(sourceEvent, result, continueResponse, (reply) => sendMiddlewareReply(sourceEvent, withBusinessRecovery("storyline.state", reply), true), false);
				if (response.handled || handled) return;
				if (response.data.finished) {
					handled = true;
					subscribe.cancel(subscription);
					await render(response.data, sourceEvent, continueResponse);
				} else schedulePoll(3e3);
			} catch {
				if (!handled) schedulePoll(3e3);
			}
		};
		schedulePoll(31e3);
		const subscription = subscribe.mount(async (event) => {
			const choice = routeChoice(String(event.MessageText ?? ""));
			if (!choice) return;
			const [, choiceNext] = useEvent();
			handled = true;
			clearTimeout(refresh);
			subscribe.cancel(subscription);
			try {
				const result = await runRobotBusiness(event, "storyline.choice", {
					sessionId: state.sessionId,
					choice
				}, parseStorylineManualBattleState, () => {
					try {
						choiceNext(true, true);
					} finally {
						subscribe.cancel(subscription);
					}
				}, async (reply) => {
					await message.send(FormatGui({
						isPrivate,
						bid,
						title: reply.title,
						content: Format.createMarkdown().addText(reply.text)
					}));
				});
				if (result.handled) return;
				await render(result.data, event, () => {
					try {
						choiceNext(true, true);
					} finally {
						subscribe.cancel(subscription);
					}
				});
			} catch (error) {
				await message.send(FormatGui({
					isPrivate,
					bid,
					title: "主线挑战",
					content: Format.createMarkdown().addText(error instanceof Error ? error.message : "技能提交失败")
				}));
			}
		}, ["UserId"]);
	};
	await render(started.state);
});

//#endregion
export { res_default as default };