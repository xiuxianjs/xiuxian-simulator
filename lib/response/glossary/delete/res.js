import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseDeleteParams, parseRobotGlossaryDelete } from "../../../api/bot/glossary-actions-robot.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { glossaryFeedbackMessage } from "../feedback.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/glossary/delete/res.ts
/**
* 删除词典词条
*
* 指令格式：
*   /删除词典 词条名
*
* 权限：仅白名单玩家可操作
* 风控：操作日志记录
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFeedback = async (reply) => {
		await message.send(glossaryFeedbackMessage(e, reply));
	};
	const keyword = parseDeleteParams(e.MessageText ?? "");
	if ((await runRobotBusiness(e, "glossary.delete", { keyword }, parseRobotGlossaryDelete, next, renderFeedback)).handled) return;
	const md = Format.createMarkdown();
	md.addText(`✅ 词条「${keyword}」已删除`);
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