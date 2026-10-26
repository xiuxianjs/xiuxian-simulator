import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseTeamApplicationStatus } from "../../../api/bot/team-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/team/joinTeam/res.ts
/**
* 加入队伍
* 指令：加入队伍 [队伍ID]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText || "").trim().match(/^(!|！|\/|#|＃)?加入队伍(?:\s+([\s\S]*))?$/);
	if (!match) return;
	const input = String(match[2] ?? "").trim();
	const teamId = /^\d+$/.test(input) ? Number(input).toString() : input;
	let data;
	try {
		const result = await runRobotBusiness(e, "teams.apply", { teamId }, parseTeamApplicationStatus, next);
		if (result.handled) return;
		data = result.data;
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
	if (data.autoApproved) md.addText("队长已开启好友自动审批，你已成功加入队伍");
	else md.addText("入队申请已发送，请等待队长审核");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };