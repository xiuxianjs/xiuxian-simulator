import { getCommandErrorMessage } from "../../utils/commandError.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseBackendLoginWindow } from "../../api/bot/account.js";
import { createOnlineUrl } from "../../utils/onlineUrl.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/emailSecurity/login.ts
function createLoginReply(result, isPrivate, bid) {
	const content = result.code === "OK" ? `UID：${result.data.playerId}\n临时密码：${result.data.temporaryPassword}\n有效期：${result.data.expiresIn / 60} 分钟` : result.message;
	const md = Format.createMarkdown();
	const quoteMd = createQuoteMarkdown(content.split("\n"));
	md.addBlockquote(quoteMd);
	const reply = FormatGui({
		isPrivate,
		bid,
		title: "网页登录",
		content: md
	});
	if (result.code === "OK") {
		const url = createOnlineUrl("/login");
		url.searchParams.set("temporaryPassword", result.data.temporaryPassword);
		url.searchParams.set("UID", String(result.data.playerId));
		const buttons = Format.createButtonGroup();
		buttons.addButton("临时进入", url.toString(), { type: "link" });
		const emailURL = createOnlineUrl("/login");
		emailURL.searchParams.set("UID", String(result.data.playerId));
		emailURL.searchParams.set("loginMethod", "email");
		if (result.data.email) emailURL.searchParams.set("email", result.data.email);
		buttons.addButton("邮箱进入", emailURL.toString(), { type: "link" });
		reply.format.addButtonGroup(buttons);
	} else if (result.code === "PASSWORD_NOT_SET") {
		const buttons = Format.createButtonGroup();
		buttons.addButton("设置密码", "/设置密码 ", { type: "command" });
		reply.format.addButtonGroup(buttons);
	}
	return reply;
}
var login_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	try {
		const response = await runRobotBusiness(e, "account.login", { private: isPrivate }, parseBackendLoginWindow, parentNext, async (reply) => {
			if (!isPrivate) {
				await message.send(FormatGui({
					isPrivate,
					bid: e.UserId,
					title: "账号安全",
					content: Format.createMarkdown().addText(reply.text),
					bar: false
				}));
				return;
			}
			const code = reply.buttons.some((button) => button.command === "/设置密码 ") ? "PASSWORD_NOT_SET" : "ERROR";
			await message.send(createLoginReply({
				code,
				message: reply.text
			}, isPrivate, e.UserId));
		});
		if (response.handled) return;
		await message.send(createLoginReply({
			code: "OK",
			data: response.data
		}, isPrivate, e.UserId));
	} catch (error) {
		if (!isPrivate) await message.send(FormatGui({
			isPrivate,
			bid: e.UserId,
			title: "账号安全",
			content: Format.createMarkdown().addText("安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。"),
			bar: false
		}));
		else await message.send(createLoginReply({
			code: "ERROR",
			message: getCommandErrorMessage(error)
		}, isPrivate, e.UserId));
	}
});

//#endregion
export { createLoginReply, login_default as default };