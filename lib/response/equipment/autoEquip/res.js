import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { parseRobotEquipmentAutoEquip } from "../../../api/bot/equipment-auto-equip.js";
import { equipmentRecoveryTips } from "../../equipmentRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/equipment/autoEquip/res.ts
/**
* 一键装备指令
* 自动为每个装备部位装备战力最高的装备
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	try {
		const result = await runRobotBusiness(e, "equipment.auto-equip", {}, parseRobotEquipmentAutoEquip, next, adviceRenderer(async (reply) => {
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
		const { results, message: msg, power } = result.data;
		const md = Format.createMarkdown();
		md.addNewline();
		results.forEach((item) => {
			if (item.equipped) md.addText(`✅ ${item.typeName}：装备了 ${item.equipmentName}`);
			else if (item.reason === "已是最佳") md.addText(`✔️ ${item.typeName}：${item.equipmentName ?? "未装备"}（已是最佳）`);
			else if (item.reason === "无可用装备") md.addText(`➖ ${item.typeName}：无可用装备`);
			else md.addText(`❌ ${item.typeName}：${item.reason ?? "装备失败"}`);
			md.addNewline();
		});
		md.addNewline();
		md.addText(msg);
		const interruption = !result.data.success ? "一键结果未完整确认" : results.some((item) => !item.equipped && item.reason === "无可用装备") ? "无可用装备" : results.length > 0 && results.every((item) => !item.equipped && item.reason === "已是最佳") ? "已是最佳" : "";
		if (interruption) appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.auto-equip", interruption));
		if (power !== void 0) {
			md.addNewline();
			md.addText(`⚔️ 当前战力✊${power}`);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "一键装备结果",
			content: md
		}));
	} catch (_error) {
		logger.error("一键装备失败:", _error);
		const md = Format.createMarkdown();
		md.addText("一键装备失败，请稍后重试");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.auto-equip", "一键装备失败，请稍后重试"));
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