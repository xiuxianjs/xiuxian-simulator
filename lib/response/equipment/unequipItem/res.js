import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { equipmentRecoveryTips } from "../../equipmentRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotEquipmentUnequipOne } from "../../../api/bot/equipment-unequip-one.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/equipment/unequipItem/res.ts
/**
* 卸下{装备类型}指令
* 进行卸下装备操作
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const equipmentTypeName = e.MessageText.trim().match(/^(!|！|\/|#|＃)?卸下\s+(.+)$/)?.[2]?.trim() ?? null;
	try {
		if ((await runRobotBusiness(e, "equipment.unequip-one", { equipmentTypeName }, parseRobotEquipmentUnequipOne, next, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			if (reply.buttons.length) md.addNewline();
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: reply.buttons.length ? reply.buttons.map((button) => ({
					label: button.label,
					command: button.command
				})) : void 0
			}));
		}))).handled) return;
		const md = Format.createMarkdown();
		md.addText(`成功卸下${equipmentTypeName}`);
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "我的装备",
				command: "/我的装备"
			}]
		}));
	} catch (error) {
		logger.error("卸下装备操作失败:", error);
		const md = Format.createMarkdown();
		md.addText("卸下装备操作失败，请稍后重试");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.unequip-one", "卸下装备操作失败，请稍后重试"));
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "我的装备",
				command: "/我的装备"
			}]
		}));
	}
});

//#endregion
export { res_default as default };