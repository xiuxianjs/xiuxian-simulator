import { BackendAPIError } from "../../../api/bot/client.js";
import { validateBackendActivatedTitle } from "../../../api/bot/title-actions.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { titleRecoveryTips } from "../../titleRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/title/activateTitle/res.ts
/**
* 佩戴称号指令处理器
* 指令格式: /佩戴称号 <编号>
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = String(e.MessageText ?? "").trim().match(/^(?:!|！|\/|#|＃)?佩戴称号\s+(\d+)$/);
	const titleId = match ? Number(match[1]) : null;
	const md = Format.createMarkdown();
	if (titleId === null || !Number.isSafeInteger(titleId) || titleId <= 0) {
		md.addText("请指定本人持有称号的记录ID，可从“我的称号”选择佩戴按钮");
		appendMiddlewareAdvice(md, titleRecoveryTips("titles.activate", "请指定称号编号"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	try {
		const result = await runRobotBusiness(e, "titles.activate", { titleId }, (data) => validateBackendActivatedTitle(data, titleId), next);
		if (result.handled) return;
		md.addText(`已佩戴称号「${result.data.title}」`);
	} catch (error) {
		logger.error("佩戴称号失败:", error);
		md.addText(error instanceof BackendAPIError && error.status === 404 ? "称号不存在或已过期" : "佩戴称号失败，请稍后重试");
		appendMiddlewareAdvice(md, titleRecoveryTips("titles.activate", error instanceof BackendAPIError && error.status === 404 ? "称号不存在或已过期" : "佩戴称号失败"));
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