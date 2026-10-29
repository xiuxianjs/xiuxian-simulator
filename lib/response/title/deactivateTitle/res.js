import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { validateBackendDeactivatedTitle } from "../../../api/bot/title-actions.js";
import { titleRecoveryTips } from "../../titleRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/title/deactivateTitle/res.ts
/**
* 卸下称号指令处理器
* 指令格式: /卸下称号
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	try {
		const result = await runRobotBusiness(e, "titles.deactivate", {}, validateBackendDeactivatedTitle, next);
		if (result.handled) return;
		md.addText(result.data.removed ? "已卸下称号" : "当前没有佩戴称号");
		if (!result.data.removed) appendMiddlewareAdvice(md, titleRecoveryTips("titles.deactivate", "当前没有佩戴称号"));
	} catch (error) {
		logger.error("卸下称号失败:", error);
		md.addText("卸下称号失败，请稍后重试");
		appendMiddlewareAdvice(md, titleRecoveryTips("titles.deactivate", "卸下称号失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "我的称号",
			command: "/我的称号"
		}]
	}));
});

//#endregion
export { response as default };