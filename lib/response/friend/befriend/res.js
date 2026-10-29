import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseBackendFriendWorkflow } from "../../../api/bot/social-workflows.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/friend/befriend/res.ts
/**
* 结交好友指令
* 指令：结交 <UID|@目标>
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?结交\s+(\d+)$/);
	const number = match ? parseInt(match[1], 10) : null;
	const parsedTargetUid = number === null ? null : isNaN(number) || number <= 0 ? -1 : number;
	const mentioned = parsedTargetUid === null ? await mention.findOne() : null;
	const targetBid = mentioned?.count && mentioned.data?.UserId ? mentioned.data.UserId : null;
	const result = await runRobotBusiness(e, "friends.request", parsedTargetUid && parsedTargetUid > 0 ? { targetUid: String(parsedTargetUid) } : targetBid ? { targetBid } : {}, (value) => parseBackendFriendWorkflow(value, "request"), next);
	if (result.handled) return;
	const data = result.data;
	if (data.outcome === "locked") {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "结交好友",
			realmName: data.realmName ?? "未知"
		});
		return;
	}
	if ((data.outcome !== "result" || !data.request) && parsedTargetUid !== -1) {
		const md = Format.createMarkdown();
		md.addText("使用方法：结交 <UID|@目标>");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.request", "使用方法"));
		md.addNewline();
		md.addText("示例：结交 10000000001 或 结交 @目标");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【结交好友】",
			content: md
		}));
		return;
	}
	if (parsedTargetUid === -1) {
		const md = Format.createMarkdown();
		md.addText("请输入有效的UID，或直接 @目标");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.request", "请输入有效UID"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (data.outcome === "result" && data.request) {
		const md = Format.createMarkdown();
		md.addText(`已向「${data.request.targetName}」发送结交申请，等待对方同意`);
		md.addNewline();
		md.addText("申请有效期：1小时");
		addOptions(md, [{
			label: "我的好友",
			command: "/我的好友"
		}]);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };