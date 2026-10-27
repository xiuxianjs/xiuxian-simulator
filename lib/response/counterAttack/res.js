import { getCommandErrorMessage } from "../../utils/commandError.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { BattleFormatGui } from "../../utils/battleMemoryMessage.js";
import { pkOwnershipText } from "../../api/bot/pk-receipt.js";
import { parseBackendCounterAttack } from "../../api/bot/counter-attack.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/counterAttack/res.ts
/**
* 回击
* 指令：/回击 记录ID
*
* 对打劫过自己的人发起反击
* - 新PK每份普通战报一次免费反击，旧模式按原回执展示
* - 不消耗每日打劫次数
* - 不增加煞气
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
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
	const idMatch = e.MessageText.match(/(\d+)/);
	const parsedId = idMatch ? Number(idMatch[1]) : null;
	const reportId = parsedId !== null && Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
	let receivedResult = false;
	let response;
	try {
		response = await runRobotBusiness(e, "pvp.counter-attack", { logId: idMatch ? String(Number(idMatch[1])) : null }, (raw) => {
			receivedResult = true;
			return parseBackendCounterAttack(raw);
		}, next, sendFailure);
	} catch (error) {
		if (receivedResult) logger.warn("反击结果无法展示：", error instanceof Error ? error.message : "未知回执错误");
		await sendFailure({
			title: "反击",
			text: receivedResult ? "反击结果暂时无法展示，请查看原战报确认本次结算。" : getCommandErrorMessage(error),
			buttons: [...reportId ? [{
				label: "原战报",
				command: `/争夺战报 ${reportId}`
			}, {
				label: "反击回放",
				command: `/争夺回放 ${reportId} 反击 1`
			}] : [], {
				label: "打劫记录",
				command: "/打劫记录"
			}]
		});
		return;
	}
	if (response.handled) return;
	const d = response.data;
	const md = Format.createMarkdown();
	md.addBlockquote(createQuoteMarkdown([
		`${d.targetName} · ${d.isWin ? "反击成功" : "反击失败"}`,
		`${d.sideA.length}v${d.sideB.length} · ${d.totalRounds}回合`,
		d.pk ? "免费反击 · 本次机会已使用" : `元力 -${d.counterHpCost} · 不扣次数 · 煞气不变`
	]));
	const rewards = [];
	if (d.pk) rewards.push(pkOwnershipText(d.pk));
	if (d.isWin && !d.pk) {
		const loot = [];
		if (d.stoneReward) loot.push(`灵石+${d.stoneReward}`);
		if (d.crystalReward) loot.push(`灵晶+${d.crystalReward}`);
		rewards.push(loot.length ? loot.join(" · ") : "未获得货币");
		if (d.bonusText) rewards.push(d.bonusText);
		if (d.droppedItem) rewards.push(`掉落：${d.droppedItem.name}×${d.droppedItem.quantity}（${d.droppedItem.category}）`);
	}
	if (d.expReward && d.expReward > 0) rewards.push(`修为 +${d.expReward}`);
	if (rewards.length) md.addNewline().addBlockquote(createQuoteMarkdown(rewards));
	md.addNewline();
	await message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "反击",
		content: md,
		footer: [
			{
				label: "文字记录",
				command: d.pk && reportId ? `/争夺回放 ${reportId} 反击 1` : `/查看战斗过程 ${d.logId}`
			},
			...d.pk && reportId ? [{
				label: "原战报",
				command: `/争夺战报 ${reportId}`
			}] : [],
			{
				label: "打劫记录",
				command: "/打劫记录"
			}
		]
	}, [{ id: d.logId }]));
});

//#endregion
export { res_default as default };