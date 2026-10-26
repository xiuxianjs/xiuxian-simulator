import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseGroupSubscriptionResult } from "../../api/bot/group-subscription-business.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/groupSubscription/res.ts
const getAction = (messageText) => {
	const text = messageText.trim().replace(/^[!！/#＃]/, "");
	if (text === "开启群订阅") return "enable";
	if (text === "关闭群订阅") return "disable";
	return null;
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const action = getAction(e.MessageText ?? "");
	if (!action) return;
	const md = Format.createMarkdown();
	const [, parentNext] = useEvent();
	const response = await runRobotBusiness(e, action === "enable" ? "notifications.group-enable" : "notifications.group-disable", {
		isPrivate,
		platform: String(e.Platform ?? ""),
		channelId: e.ChannelId ? String(e.ChannelId) : "",
		botId: e.BotId ?? null,
		targetScope: e.Target?.scope === "channel" || e.SpaceId?.startsWith("GUILD:") ? "channel" : "group"
	}, (value) => parseGroupSubscriptionResult(value, action), parentNext, async (reply) => {
		const content = Format.createMarkdown().addText(reply.text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的设置",
			content
		}));
	}).catch(async (error) => {
		logger.error("群订阅操作失败:", error);
		const content = Format.createMarkdown().addText(error instanceof Error ? error.message : "群订阅操作失败");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的设置",
			content
		}));
		return { handled: true };
	});
	if (response.handled) return;
	if (action === "enable") {
		const result = response.data;
		md.addText(result.switched ? "已将订阅群切换至本群。" : "已在本群开启通知订阅。");
		md.addNewline();
		md.addText("通知优先发至本群，权限受限时可查看通知记录。");
	} else if (action === "disable") {
		const disabled = response.data.disabled;
		md.addText(disabled ? "已关闭群通知订阅。" : "你当前未开启群通知订阅。");
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		mention: false,
		title: "我的设置",
		content: md,
		footer: [{
			label: "通知记录",
			command: "/我的通知"
		}, {
			label: "我的设置",
			command: "/我的设置"
		}]
	}));
});

//#endregion
export { res_default as default };