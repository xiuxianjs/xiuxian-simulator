import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { requireTeamObject } from "../../../api/bot/team-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/team/acceptInvitation/res.ts
/**
* 接受队伍邀请
* 指令：队伍邀请同意 [邀请ID]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText || "").match(/^(!|！|\/|#|＃)?队伍邀请同意\s+(\d+)$/);
	if (!match) return;
	try {
		if ((await runRobotBusiness(e, "teams.invitation-accept", { invitationId: parseInt(match[2]).toString() }, (value) => requireTeamObject(value, "接受队伍邀请"), next)).handled) return;
	} catch (error) {
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
	md.addText("已接受邀请，加入队伍");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };