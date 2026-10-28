import { parseTeamTargetMutation } from "../../../api/bot/team-actions.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolveRobotTarget } from "../../../utils/targetUid.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/team/kick/res.ts
/**
* 踢出队员
* 指令：队伍踢出 [玩家UID/@目标]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const regex = /^(!|！|\/|#|＃)?队伍踢出\s+(.+)$/;
	const messageText = e.MessageText || "";
	if (!messageText.match(regex)) return;
	const targetUid = await resolveRobotTarget(messageText, mention);
	let data;
	try {
		const result = await runRobotBusiness(e, "teams.kick", targetUid ? { target: targetUid } : {}, (value) => parseTeamTargetMutation(value, false), next);
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
	if (data.outcome === "target_missing") {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText("未找到有效的目标队员，请从当前队伍成员中核对UID，或直接 @目标。"),
			footer: [{
				label: "核对队伍成员",
				command: "/我的队伍"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText("已将该玩家踢出队伍");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };