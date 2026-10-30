import { createBackendRequestContext } from "../../../api/bot/context.js";
import { formatGameTime } from "../../../utils/gameTime.js";
import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolveRobotTarget } from "../../../utils/targetUid.js";
import { parsePKReceipt } from "../../../api/bot/pk-receipt.js";
import { parseBackendRobbery } from "../../../api/bot/robbery.js";
import { sendBattleResult } from "../../../utils/battleMemoryMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/robbery/triple/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const [, next] = useEvent();
	const isPrivate = isPrivateEvent(e);
	const receipts = [];
	let stopped = "";
	let stopButtons = [];
	const sendText = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid: e.UserId,
			title: "三连打劫",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const target = await resolveRobotTarget(e.MessageText, mention);
	if (!target) {
		await sendText("请正确输入指令，示例：/三连打劫 UID 或 /三连打劫 @目标");
		return;
	}
	for (let index = 1; index <= 3; index++) {
		const request = createBackendRequestContext(e, `pvp.robbery.triple.${index}`);
		if (!request.idempotencyKey) {
			stopped = "消息缺少有效标识，无法安全发起三连打劫。";
			break;
		}
		try {
			const response = await runRobotBusiness(e, "pvp.robbery", { target }, parseBackendRobbery, next, (reply) => {
				stopped = reply.text;
				stopButtons = reply.buttons;
				return Promise.resolve();
			}, request);
			if (response.handled) {
				stopped ||= "本次未继续执行，请查看服务端提示。";
				break;
			}
			receipts.push(response.data);
			if (response.data.remaining === 0 && index < 3) {
				stopped = "今日打劫次数已用完。";
				break;
			}
		} catch {
			stopped = `第${index}次打劫结果暂未确认，已停止后续打劫，请查看打劫记录。`;
			break;
		}
	}
	const md = Format.createMarkdown().addText(`已确认完成 ${receipts.length}/3 次`);
	for (const [index, result] of receipts.entries()) {
		const pk = parsePKReceipt(result);
		const won = pk?.won ?? result.winner === "A";
		const lines = [`第${index + 1}次 · ${result.targetName} · ${won ? "打劫成功" : "打劫失败"}`, `元力 -${result.qiCost} · 今日剩余${result.remaining}/${result.dailyMax}次`];
		if (won) {
			const loot = [];
			if (result.stoneReward) loot.push(`灵石+${result.stoneReward}`);
			if (result.crystalReward) loot.push(`灵晶+${result.crystalReward}`);
			lines.push(loot.length ? loot.join(" · ") : "未获得货币");
			lines.push(`煞气 +${result.shaQiChange}（当前${result.currentShaQi}）`);
			if (result.bonusText) lines.push(result.bonusText);
			if (result.droppedItem) lines.push(`${pk ? "暂存" : "掉落"}：${result.droppedItem.name}×${result.droppedItem.quantity}${pk ? "（尚未到手）" : ""}`);
		}
		if (result.experience > 0) lines.push(`修为 +${result.experience}`);
		if (pk) lines.push(`对方反击截止：${formatGameTime(pk.counterDeadline)}`);
		if (result.losingStreakText) lines.push(result.losingStreakText);
		const buttons = pk && Number.isSafeInteger(result.logId) && result.logId > 0 ? [{
			label: "战报",
			command: `/争夺战报 ${result.logId}`
		}, {
			label: "文字记录",
			command: `/争夺回放 ${result.logId} 原战 1`
		}] : [{
			label: "文字记录",
			command: `/查看战斗过程 ${result.battleLogId}`
		}];
		md.addNewline().addBlockquote(createQuoteMarkdown(lines, buttons));
	}
	if (receipts.length) {
		const last = receipts[receipts.length - 1];
		md.addNewline().addText(`已确认消耗元力 ${receipts.reduce((sum, result) => sum + result.qiCost, 0)} · 今日剩余${last.remaining}/${last.dailyMax}次`);
	}
	if (stopped) md.addNewline().addText(stopped);
	await sendBattleResult(message, {
		isPrivate,
		bid: e.UserId,
		title: "三连打劫",
		content: md,
		footer: [
			...stopButtons,
			{
				label: "打劫记录",
				command: "/打劫记录"
			},
			{
				label: "可打劫道友",
				command: "/可打劫道友"
			}
		]
	}, receipts.map((result, index) => ({
		id: result.battleLogId,
		label: `第${index + 1}次战斗回忆`
	})));
});

//#endregion
export { res_default as default };