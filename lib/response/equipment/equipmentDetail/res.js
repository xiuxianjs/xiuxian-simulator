import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { parseRobotEquipmentDetail } from "../../../api/bot/equipment-detail-queries.js";
import { recoveryEffectsMarkdown } from "../../../utils/resourceRecoveryDisplay.js";
import { equipmentRecoveryTips } from "../../equipmentRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { formatStatParts } from "../setEffectFormat.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/equipment/equipmentDetail/res.ts
/**
* 我的{装备类型}指令
* 显示特定部位装备的详细信息
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const equipmentTypeName = e.MessageText.trim().match(/^(!|！|\/|#|＃)?我的(武器|饰品|法袍|衣服|鞋子?|头饰|羽翼)$/)?.[2]?.trim() ?? null;
	try {
		const result = await runRobotBusiness(e, "equipment.detail", { typeName: equipmentTypeName }, parseRobotEquipmentDetail, next, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (result.handled) return;
		const { item: equippedItem, playerName } = result.data;
		const md = Format.createMarkdown();
		md.addText(`装备名称：${equippedItem.equipment.name}`);
		md.addNewline();
		md.addText(`品级：${equippedItem.equipment.grade?.name ?? "未知"}`);
		md.addNewline();
		md.addText(`装备ID：${equippedItem.id}`);
		md.addNewline();
		if (equippedItem.crafterName) {
			md.addText(`打造者：${equippedItem.crafterName}`);
			md.addNewline();
		}
		const attrs = formatStatParts(equippedItem, "full", "：").map((s) => `   ${s}`);
		if (attrs.length > 0) {
			md.addNewline();
			md.addText("【属性信息】");
			md.addNewline();
			attrs.forEach((attr) => {
				md.addText(attr);
				md.addNewline();
			});
		} else {
			md.addNewline();
			md.addText("【属性信息】");
			md.addNewline();
			md.addText("暂无属性加成");
			md.addNewline();
		}
		md.addNewline();
		md.addText(`状态：${equippedItem.isLocked ? "已锁定" : "未锁定"}`);
		md.addNewline();
		md.addNewline();
		if (equippedItem.recoveryEffects?.length) md.addBlockquote(recoveryEffectsMarkdown(equippedItem.recoveryEffects));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `${playerName}的${equipmentTypeName}详情`,
			content: md,
			footer: [{
				label: `卸下 ${equipmentTypeName}`,
				command: `/卸下 ${equipmentTypeName}`
			}]
		}));
	} catch (error) {
		logger.error("获取装备详情失败:", error);
		const md = Format.createMarkdown();
		md.addText("获取装备详情失败，请稍后重试");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.detail", "查询失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };