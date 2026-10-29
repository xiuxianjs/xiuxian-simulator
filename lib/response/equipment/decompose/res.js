import { parseBackendEquipmentDecompose } from "../../../api/bot/equipment-decompose.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { equipmentRecoveryTips } from "../../equipmentRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/equipment/decompose/res.ts
/**
* 分解装备指令处理器
* 指令格式: /分解装备 {装备实例ID}
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const rawId = e.MessageText.replace(/^(!|！|\/|#|＃)?分解装备\s*/, "").trim().split(/\s+/)[0] || null;
	try {
		const result = await runRobotBusiness(e, "equipment.decompose", { instanceId: rawId }, parseBackendEquipmentDecompose, next, adviceRenderer(async (reply) => {
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
		const data = result.data;
		const md = Format.createMarkdown();
		md.addText(`✅ 分解成功！【${data.equipmentName}】(${data.equipmentGrade}) → ${data.yieldItemName} ×${data.yieldQuantity}`);
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "查看储物袋",
				command: "/我的储物袋 装备"
			}]
		}));
	} catch (error) {
		logger.error("分解装备失败:", error);
		const md = Format.createMarkdown();
		md.addText("分解装备失败，请稍后再试或联系运营。");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.decompose", "结果未确认"));
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