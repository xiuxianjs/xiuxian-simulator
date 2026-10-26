import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseTeamAcknowledgement } from "../../../api/bot/team-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/team/reject/res.ts
/**
* 拒绝入队申请
* 指令：队伍拒绝 [申请编号]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText || "").match(/^(!|！|\/|#|＃)?队伍拒绝\s+(\d+)$/);
	if (!match) return;
	try {
		if ((await runRobotBusiness(e, "teams.application-reject", { applicationId: Number(match[2]).toString() }, (value) => parseTeamAcknowledgement(value, "rejected"), next)).handled) return;
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
	md.addText("已拒绝该玩家的入队申请");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };