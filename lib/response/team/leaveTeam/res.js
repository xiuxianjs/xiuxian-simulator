import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseTeamAcknowledgement } from "../../../api/bot/team-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/team/leaveTeam/res.ts
/**
* 离开队伍
* 指令：离开队伍
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const regex = /^(!|！|\/|#|＃)?离开队伍$/;
	const messageText = e.MessageText || "";
	if (!regex.test(messageText)) return;
	try {
		if ((await runRobotBusiness(e, "teams.leave", {}, (value) => parseTeamAcknowledgement(value, "left"), next)).handled) return;
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
	md.addText("你已离开队伍");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };