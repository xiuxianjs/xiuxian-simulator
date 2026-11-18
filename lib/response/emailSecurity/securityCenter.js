import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseRobotSecurityCenter } from "../../api/bot/security-center.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/emailSecurity/securityCenter.ts
/**
* 我的安全中心指令
* 显示用户ID、账号状态和网页登录入口
*/
/**
* 我的安全中心指令处理器
* 指令格式：/我的安全中心
*/
var securityCenter_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const isPrivate = e.isPrivate ?? false;
	const bid = e?.UserId;
	const [, parentNext] = useEvent();
	const securityFooter = [
		[{
			label: "临时登录",
			command: "/登录"
		}],
		[{
			label: "设置密码",
			command: "/设置密码 "
		}, {
			label: "绑定邮箱",
			command: "/绑定邮箱 你的邮箱"
		}],
		[{
			label: "更换账号",
			command: "/更换账号 UID"
		}, {
			label: "更换邮箱",
			command: "/更换邮箱 新邮箱"
		}]
	];
	const notFound = async () => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "安全中心",
			header: [{
				label: "返回",
				command: "/更多"
			}],
			content: Format.createMarkdown().addText("用户信息未找到，请先注册账号"),
			footer: securityFooter
		}));
	};
	try {
		const response = await runRobotBusiness(e, "account.security-center", { private: isPrivate }, parseRobotSecurityCenter, parentNext, async (reply) => {
			if (!isPrivate) await message.send(FormatGui({
				isPrivate,
				bid,
				title: "账号安全",
				content: Format.createMarkdown().addText(reply.text),
				bar: false
			}));
			else await notFound();
		});
		if (response.handled) return;
		const result = response.data;
		const md = Format.createMarkdown();
		md.addText(`${result.name}（${result.id}）`);
		md.addNewline();
		if (result.email) {
			const masked = result.email.split("").join(" ");
			md.addText(`邮箱：${masked}`);
		} else md.addText("邮箱：未绑定");
		md.addNewline();
		if (result.hasPassword) md.addText("固定密码：已设置");
		else md.addText("固定密码：未设置");
		md.addNewline();
		md.addDivider();
		md.addText("服务登录：UID、固定密码、邮箱或临时密码");
		md.addNewline();
		md.addText("临时密码：私聊发送 /登录 获取，30 分钟内有效");
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "安全中心",
			content: md,
			footer: securityFooter
		}));
	} catch (error) {
		logger.error("[安全中心] 错误:", error);
		if (!isPrivate) await message.send(FormatGui({
			isPrivate,
			bid,
			title: "账号安全",
			content: Format.createMarkdown().addText("安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。"),
			bar: false
		}));
		else await notFound();
	}
});

//#endregion
export { securityCenter_default as default };