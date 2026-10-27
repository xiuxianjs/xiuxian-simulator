import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendFriendSettings } from "../../../api/bot/friend-settings.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/friend/friendSettings/res.ts
/**
* 好友设置指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?好友设置\s*(开启|关闭)?$/);
	const action = match ? match[1] ?? "view" : null;
	if (action === null) return;
	const enabled = action === "开启";
	let result;
	try {
		result = await runRobotBusiness(e, action === "view" ? "friends.settings" : "friends.settings-update", action === "view" ? {} : { enabled }, (data) => {
			const settings = parseBackendFriendSettings(data);
			if (action !== "view" && settings.canUseFifthLayerFeature && settings.isEnabled !== enabled) throw new Error("好友设置状态不一致");
			return settings;
		}, next);
	} catch (error) {
		const text = error instanceof Error ? error.message : "好友设置查询失败";
		const md = Format.createMarkdown().addText(text);
		appendMiddlewareAdvice(md, friendRecoveryTips(action === "view" ? "friends.settings" : "friends.settings-update", text));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "好友设置",
			content: md
		}));
		return;
	}
	if (result.handled) return;
	const settings = result.data;
	if (!settings.canUseFifthLayerFeature) {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "好友设置",
			realmName: settings.realmName ?? "未知"
		});
		return;
	}
	const isEnabled = settings.isEnabled;
	const statusText = isEnabled ? "接受好友申请 ✓" : "已关闭好友申请";
	const buttonText = isEnabled ? "关闭申请" : "开启申请";
	const buttonAction = isEnabled ? "好友设置 关闭" : "好友设置 开启";
	const md = Format.createMarkdown();
	md.addText(`当前状态：${statusText}`);
	md.addNewline().addText("此设置仅控制本人是否接收结交申请，不会改变对方设置、清除已有好友或拉黑记录");
	md.addNewline();
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "【好友设置】",
		content: md,
		footer: [{
			label: buttonText,
			command: buttonAction
		}]
	}));
});

//#endregion
export { res_default as default };