import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { errorBubble, resultBubble } from "../../presentation/presets.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { logger, onResponse, useEvent } from "alemonjs";

//#region src/response/notification/read-all/res.ts
function parseReadCount(data) {
	const count = data?.count;
	if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("通知已读回执无效");
	return count;
}
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	if (!/^[!！/#＃]?一键通知已读$/u.test((e.MessageText ?? "").trim())) return next();
	const [message] = useMessage$1();
	const bubble = {
		isPrivate: isPrivateEvent(e),
		bid: e.UserId,
		title: "一键通知已读",
		footer: [{
			label: "返回资料",
			command: "/我的资料"
		}, {
			label: "我的通知",
			command: "/我的通知"
		}]
	};
	try {
		const result = await runRobotBusiness(e, "notifications.mark-all-read", {}, parseReadCount, next);
		if (!result.handled) await message.send(resultBubble({
			...bubble,
			status: "done",
			lines: [result.data > 0 ? `已将 ${result.data} 条通知标记为已读。` : "暂无可标记为已读的通知。"]
		}));
	} catch (error) {
		logger.error("批量标记通知已读失败", error);
		await message.send(errorBubble({
			...bubble,
			reason: "暂时无法确认操作结果，请返回资料查看通知栏。"
		}));
	}
});

//#endregion
export { res_default as default };