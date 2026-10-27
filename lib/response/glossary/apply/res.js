import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { GLOSSARY_APPLY_REASON_MAX_LENGTH, parseApplyParams, parseRobotGlossaryApply } from "../../../api/bot/glossary-actions-robot.js";
import { glossaryFeedbackMessage } from "../feedback.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/glossary/apply/res.ts
/**
* 申请词典编辑权限
*
* 指令格式：
*   /申请词典编辑权限
*   /申请词典编辑权限 申请理由
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFeedback = async (reply) => {
		await message.send(glossaryFeedbackMessage(e, reply));
	};
	const parsed = parseApplyParams(e.MessageText ?? "");
	if ((await runRobotBusiness(e, "glossary.apply", { reason: parsed.reason }, parseRobotGlossaryApply, next, renderFeedback)).handled) return;
	const md = Format.createMarkdown();
	md.addText("✅ 词典编辑权限申请已提交");
	md.addNewline();
	if (parsed.reason) {
		md.addText(`申请理由：${parsed.reason}`);
		md.addNewline();
	}
	md.addText(`如需补充说明，可使用：/申请词典编辑权限 申请理由（最多${100}字）`);
	md.addNewline();
	md.addText("请等待运营在审核项目中处理，审核通过后即可录入词典。");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "词典",
		content: md,
		footer: [{
			label: "返回词典",
			command: "/词典"
		}, {
			label: "录入词典",
			command: "/录入词典"
		}]
	}));
});

//#endregion
export { res_default as default };