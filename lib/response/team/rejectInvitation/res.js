import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/rejectInvitation/res.ts
/**
* 拒绝队伍邀请
* 指令：队伍邀请拒绝 [邀请ID]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText || "").match(/^(!|！|\/|#|＃)?队伍邀请拒绝\s+(\d+)$/);
	if (!match) return;
	const invitationId = match[2];
	try {
		if ((await runRobotBusiness(e, "teams.invitation-reject", { invitationId: parseInt(invitationId, 10).toString() }, (value) => {
			if (!value || typeof value !== "object" || Array.isArray(value) || !("rejected" in value) || value.rejected !== true) throw new Error("队伍邀请响应不完整");
			return value;
		}, next)).handled) return;
	} catch (error) {
		logger.error(error);
		const md = Format.createMarkdown();
		md.addText(error instanceof Error ? error.message : "操作失败");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText("已拒绝该邀请");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };