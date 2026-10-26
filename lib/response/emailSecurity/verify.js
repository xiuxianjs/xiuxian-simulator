import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseBackendEmailConfirmation } from "../../api/bot/account.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/emailSecurity/verify.ts
/**
* 验证指令（邮箱安全相关流程共用）。验证码、待办状态和确认后的账号写入都由 Go 服务端保存。
*/
const TITLE_MAP = {
	bind: "绑定邮箱",
	change: "更换账号",
	changeEmail: "更换邮箱"
};
var verify_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	const sendText = async (title, text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title,
			content: md,
			...isPrivate ? {} : { bar: false }
		}));
	};
	try {
		const result = await runRobotBusiness(e, "account.verify-email", {
			input: e.MessageText,
			private: isPrivate
		}, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value) || !("type" in value) || ![
				"bind",
				"change",
				"changeEmail"
			].includes(String(value.type))) throw new Error("账号接口返回不完整，请更新服务端后重试");
			const type = value.type;
			return {
				type,
				data: parseBackendEmailConfirmation(value, type)
			};
		}, parentNext, (reply) => sendText(reply.title, reply.text));
		if (result.handled) return;
		const { type, data } = result.data;
		if (type === "bind") await sendText(TITLE_MAP[type], `验证成功！邮箱绑定完成\n绑定邮箱：【${String(data.email ?? "").split("").join(" ")}】`);
		else if (type === "change") await sendText(TITLE_MAP[type], `账号切换成功：${String(data.fromName ?? "")} → ${String(data.toName ?? "")}`);
		else await sendText(TITLE_MAP[type], `邮箱更换成功\n旧邮箱：【${String(data.oldEmail ?? "").split("").join(" ")}】\n新邮箱：【${String(data.newEmail ?? "").split("").join(" ")}】`);
	} catch (error) {
		logger.error("/验证 指令处理失败:", error);
		await sendText(isPrivate ? "绑定邮箱" : "账号安全", isPrivate ? error instanceof Error ? error.message : "系统错误，请稍后再试或联系运营" : "安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。");
	}
});

//#endregion
export { verify_default as default };