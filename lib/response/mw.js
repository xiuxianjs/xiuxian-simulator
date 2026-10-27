import { formatGameTime } from "../utils/gameTime.js";
import { FormatGui } from "../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "./middlewareReply.js";
import { withBusinessRecovery } from "./businessRecovery.js";
import { sendRegistrationNamePrompt } from "./start/namePrompt.js";
import { Format, logger } from "alemonjs";

//#region src/response/mw.ts
var mw_default = async (event, result) => {
	if (result.reason === "UNREGISTERED") {
		for (const reply of result.replies) if (reply.buttons.some((button) => button.command === "/我是")) await sendRegistrationNamePrompt(event);
		else await sendMiddlewareReply(event, reply);
		return false;
	}
	const [message] = useMessage$1(event);
	const bid = event.UserId;
	const isPrivate = event.isPrivate ?? event.name.startsWith("private.");
	const entry = result.entry;
	if (!entry) return true;
	if (entry.maintenance.disabled) {
		for (const reply of result.replies.slice(0, -1)) await sendMiddlewareReply(event, reply);
		const rule = entry.maintenance;
		const md = Format.createMarkdown();
		md.addText("⚠️ 该功能维护中");
		md.addNewline();
		md.addText(`维护原因：${rule.reason ?? "功能维护中"}`);
		md.addNewline();
		md.addText(`预计恢复：${formatGameTime(rule.endTime)}`);
		md.addNewline();
		md.addText("请耐心等待恢复后再使用。");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "功能维护",
			content: md
		}));
		return false;
	}
	if (entry.processingError) logger.error(`玩家入口领域处理未完成：${entry.processingError}`);
	if (entry.featureGuard?.blocked) {
		const notices = result.reason === "ENTRY_FAILED" ? result.replies.slice(0, -1) : result.replies;
		for (const reply of notices) await sendMiddlewareReply(event, reply);
		const guard = entry.featureGuard;
		const md = Format.createMarkdown();
		md.addText(`${guard.reason ?? "当前境界尚未达到该功能要求"}；当前境界：${guard.realmName ?? "未知境界"}。`);
		const guidance = withBusinessRecovery("realm.overview", {
			title: "功能未解锁",
			heading: "",
			text: `境界条件未满足：${guard.reason ?? ""}`,
			buttons: [],
			advice: []
		});
		appendMiddlewareAdvice(md, guidance.advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "功能未解锁",
			content: md,
			footer: [{
				label: "我的境界",
				command: "/我的境界"
			}]
		}));
		return false;
	}
	return true;
};

//#endregion
export { mw_default as default };