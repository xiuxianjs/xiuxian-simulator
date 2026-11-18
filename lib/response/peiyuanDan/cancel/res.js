import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendPeiyuanCancel } from "../../../api/bot/peiyuan-cancel.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/peiyuanDan/cancel/res.ts
/**
* 取消培元丹效果
* 指令：/取消培元丹
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, parentNext] = useEvent();
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("peiyuan.cancel", reply), true));
	if (!/^[!！/#＃]?取消培元丹$/.test((e.MessageText ?? "").trim())) {
		await failure({
			title: "",
			heading: "",
			text: "参数错误：取消培元丹不接收额外参数，请先核对原预览。",
			buttons: [],
			advice: []
		});
		return;
	}
	try {
		const response = await runRobotBusiness(e, "peiyuan.cancel", {}, parseBackendPeiyuanCancel, parentNext, failure);
		if (response.handled) return;
		if (response.data.outcome === "not_pending") {
			await failure({
				title: "",
				heading: "",
				text: response.data.message,
				buttons: [],
				advice: []
			});
			return;
		}
		const result = { data: response.data };
		const md = Format.createMarkdown();
		md.addText("⚠️ 培元丹效果已取消");
		md.addNewline();
		md.addNewline();
		md.addText(result.data.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "查看属性",
				command: "/属性面板"
			}, {
				label: "继续服用",
				command: "/服用 培元丹 1"
			}]
		}));
	} catch (error) {
		logger.error("取消培元丹失败:", error);
		await failure({
			title: "",
			heading: "",
			text: "培元丹取消结果未获完整确认，请先核对属性、原预览与持有数量。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { res_default as default };