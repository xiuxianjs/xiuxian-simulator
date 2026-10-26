import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { MSG_FRIEND } from "../../../constants/messages.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import { parseBackendFriendWorkflow } from "../../../api/bot/social-workflows.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/friend/deleteFriend/res.ts
/**
* 删除好友指令
* - /删除好友 UID/@目标      → 提示再次发送带「确认」的指令完成删除
* - /删除好友 UID/@目标 确认 → 直接执行删除
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?删除好友\s+(.+?)(\s+确认)?$/);
	const parsed = match ? {
		targetArg: match[1].trim(),
		confirmed: Boolean(match[2])
	} : null;
	let selector = {};
	if (parsed) {
		const numeric = /^\d+$/.test(parsed.targetArg.trim()) ? Number(parsed.targetArg.trim()) : 0;
		if (Number.isFinite(numeric) && numeric > 0) selector = { targetUid: numeric.toString() };
		else {
			const targetMention = await mention.findOne();
			if (targetMention?.count && targetMention.data?.UserId) selector = { targetBid: targetMention.data.UserId };
		}
	}
	const result = await runRobotBusiness(e, "friends.remove", {
		confirmed: parsed?.confirmed ?? false,
		...selector
	}, (value) => parseBackendFriendWorkflow(value, "remove"), next);
	if (result.handled) return;
	const workflow = result.data;
	if (workflow.outcome === "locked") {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "删除好友",
			realmName: workflow.realmName ?? "未知"
		});
		return;
	}
	if (parsed === null) {
		const md = Format.createMarkdown();
		md.addText("使用方法：删除好友 <好友UID|@目标>");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.remove", "使用方法：删除好友 <好友UID|@目标>"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【删除好友】",
			content: md
		}));
		return;
	}
	const { confirmed } = parsed;
	const targetId = workflow.targetId ? Number(workflow.targetId) : null;
	const targetUser = workflow.target;
	if (!targetId) {
		const md = Format.createMarkdown();
		md.addText("请输入有效的好友UID，或直接 @目标");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.remove", "请输入有效的好友UID，或直接 @目标"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (!targetUser) {
		const md = Format.createMarkdown();
		md.addText(`未找到ID为「${targetId}」的玩家`);
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.remove", `未找到ID为「${targetId}」的玩家`));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const targetName = targetUser.name;
	if (!confirmed) {
		const md = Format.createMarkdown();
		md.addText(`确定要删除好友「${targetName}」吗？`);
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "确认删除",
				command: `/删除好友 ${targetId} 确认`
			}]
		}));
		return;
	}
	const removal = workflow.removal;
	if (!removal) throw new Error("删除好友响应不完整");
	if (removal.outcome === "locked") {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "删除好友",
			realmName: removal.realmName ?? "未知"
		});
		return;
	}
	const md = Format.createMarkdown();
	const messages = {
		removed: "已删除好友",
		self: MSG_FRIEND.CANNOT_OPERATE_SELF,
		not_friend: MSG_FRIEND.NOT_YOUR_FRIEND,
		companion: MSG_FRIEND.IS_COMPANION,
		failed: MSG_FRIEND.DELETE_FAILED
	};
	md.addText(messages[removal.outcome]);
	if (removal.outcome !== "removed") appendMiddlewareAdvice(md, friendRecoveryTips("friends.remove", messages[removal.outcome]));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "我的好友",
			command: "/我的好友"
		}]
	}));
});

//#endregion
export { res_default as default };