import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendUnblock } from "../../../api/bot/blocklist-removal.js";
import { parseGuardedSocialAction } from "../../../api/bot/social-robot-query.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/friend/unblockUser/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const input = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?取消拉黑\s+(.+)$/)?.[1]?.trim() ?? "";
	const numeric = /^[+-]?\d+$/.test(input);
	const args = !input ? {} : numeric ? { recordId: (numeric ? parseInt(input, 10) : NaN).toString() } : { exactName: input };
	const result = await runRobotBusiness(e, "friends.unblock", args, (value) => parseGuardedSocialAction(value, parseBackendUnblock), next);
	if (result.handled) return;
	const { access, data } = result.data;
	if (!access.ok) {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "取消拉黑",
			realmName: access.realmName
		});
		return;
	}
	if (!input) {
		const md = Format.createMarkdown();
		md.addText("使用方法：取消拉黑 <记录ID或玩家名称>");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.unblock", "使用方法：取消拉黑 <记录ID或玩家名称>"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【取消拉黑】",
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
			title: "取消拉黑",
			realmName: data.realmName ?? "未知"
		});
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`已将${data.name ?? "该用户"}移出黑名单`);
	appendMiddlewareAdvice(md, friendRecoveryTips("friends.unblock", `已将${data.name ?? "该用户"}移出黑名单`));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };