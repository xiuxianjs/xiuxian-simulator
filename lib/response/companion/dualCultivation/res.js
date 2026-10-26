import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendCompanionDualCultivation } from "../../../api/bot/companion-relationship-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/dualCultivation/res.ts
/**
* 双修指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const response = await runRobotBusiness(e, "companion.dual-cultivation", {}, parseBackendCompanionDualCultivation, next, async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: Format.createMarkdown().addText(reply.text),
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	if (response.handled) return;
	const result = response.data;
	const lines = [
		"灵息交融，双修已毕。",
		result.creditedExperience === void 0 ? "你的修为已结算" : `你的修为 ${result.creditedExperience}`,
		result.partnerCreditedExperience === void 0 ? "道侣修为已结算" : `道侣修为 ${result.partnerCreditedExperience}`,
		`同心值 +${result.tongxinGained}`
	];
	const md = Format.createMarkdown();
	md.addText(lines.join("\n"));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "道侣任务",
			command: "/道侣任务"
		}, {
			label: "我的道侣",
			command: "/我的道侣"
		}]
	}));
});

//#endregion
export { res_default as default };