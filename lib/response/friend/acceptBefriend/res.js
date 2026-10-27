import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendFriendMutation } from "../../../api/bot/friend-request-actions.js";
import { parseGuardedSocialAction } from "../../../api/bot/social-robot-query.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/friend/acceptBefriend/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const input = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?同意结交\s+(\d+)$/)?.[1]?.trim() ?? "";
	const id = input ? parseInt(input, 10) : null;
	const args = { requestId: id === null ? "" : id.toString() };
	const result = await runRobotBusiness(e, "friends.accept", args, (value) => parseGuardedSocialAction(value, parseBackendFriendMutation), next);
	if (result.handled) return;
	const { access, data } = result.data;
	if (!access.ok) {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "同意结交",
			realmName: access.realmName
		});
		return;
	}
	if (!input) {
		const md = Format.createMarkdown();
		md.addText("使用方法：同意结交 <申请ID>");
		appendMiddlewareAdvice(md, [{
			command: "/好友申请",
			description: "从本人收到的待处理申请选择申请编号，玩家UID不能代替申请ID"
		}]);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【同意结交】",
			content: md
		}));
		return;
	}
	if (data === null) throw new Error("社交操作响应不完整");
	const md = Format.createMarkdown();
	md.addText(`已同意「${data.fromUserName}」的结交申请`);
	md.addNewline();
	md.addText("你们已成为好友");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };