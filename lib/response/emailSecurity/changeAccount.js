import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/emailSecurity/changeAccount.ts
/**
* 更换账号指令
* 用法：/更换账号 <目标用户UID>
* 发送验证码后，用户发送 /验证 <6位数字> 完成切换。
*/
var changeAccount_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	const sendText = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: isPrivate ? "更换账号" : "账号安全",
			content: md,
			...isPrivate ? {} : { bar: false }
		}));
	};
	try {
		const result = await runRobotBusiness(e, "account.change-account", {
			input: e.MessageText,
			private: isPrivate
		}, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value) || !("currentUserEmail" in value) || !("targetUserName" in value) || typeof value.currentUserEmail !== "string" || typeof value.targetUserName !== "string") throw new Error("邮箱验证响应不完整");
			return {
				currentUserEmail: value.currentUserEmail,
				targetUserName: value.targetUserName
			};
		}, parentNext, (reply) => sendText(reply.text));
		if (result.handled) return;
		const { currentUserEmail, targetUserName } = result.data;
		await sendText(`切换目标：【${targetUserName}】\n验证码已发送至：【${currentUserEmail.split("").join(" ")}】\n请在3分钟内发送：/验证 6位验证码`);
	} catch (error) {
		logger.error("更换账号指令处理失败:", error);
		await sendText(isPrivate ? error instanceof Error ? error.message : "更换账号失败，请稍后再试" : "安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。");
	}
});

//#endregion
export { changeAccount_default as default };