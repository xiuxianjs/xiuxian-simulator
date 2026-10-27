import { parseTeamCreated } from "../../../api/bot/team-actions.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/team/createTeam/res.ts
/**
* 创建队伍
* 指令：创建队伍
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const regex = /^(!|！|\/|#|＃)?创建队伍$/;
	const messageText = e.MessageText || "";
	if (!regex.test(messageText)) return;
	let data;
	try {
		const result = await runRobotBusiness(e, "teams.create", {}, parseTeamCreated, next);
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
	md.addText(`队伍ID：${data.teamId}`);
	md.addNewline();
	md.addNewline();
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "队伍创建成功",
		content: md,
		footer: [{
			label: "我的队伍",
			command: "/我的队伍"
		}, {
			label: "申请列表",
			command: "/队伍申请"
		}]
	}));
});

//#endregion
export { res_default as default };