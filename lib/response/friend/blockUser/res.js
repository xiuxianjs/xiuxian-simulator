import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendBlockUser } from "../../../api/bot/block-user-by-name.js";
import { parseGuardedSocialAction } from "../../../api/bot/social-robot-query.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/friend/blockUser/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const input = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?拉黑\s+(.+)$/)?.[1]?.trim() ?? "";
	const result = await runRobotBusiness(e, "friends.block", { targetName: input }, (value) => parseGuardedSocialAction(value, parseBackendBlockUser), next);
	if (result.handled) return;
	const { access, data } = result.data;
	if (!access.ok) {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "拉黑用户",
			realmName: access.realmName
		});
		return;
	}
	if (!input) {
		const md = Format.createMarkdown();
		md.addText("使用方法：拉黑 <玩家名称>");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.block", "使用方法：拉黑 <玩家名称>"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【拉黑用户】",
			content: md
		}));
		return;
	}
	if (data === null) throw new Error("社交操作响应不完整");
	if (data.outcome === "locked") {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "拉黑用户",
			realmName: data.realmName ?? "未知"
		});
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`已将${data.name}加入黑名单`);
	md.addNewline();
	md.addText("对方将无法向你发送结交申请");
	appendMiddlewareAdvice(md, friendRecoveryTips("friends.block", `已将${data.name}加入黑名单`));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };