import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolvePositionTarget } from "../../../utils/teamTarget.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTeamWorkflow } from "../../../api/bot/social-workflows.js";
import { Format, logger, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/team/setPosition/res.ts
/**
* 队伍位置设置
* 指令：队伍位置设置 [玩家UID/@目标] [位置序号]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText || "").match(/^(!|！|\/|#|＃)?队伍位置设置\s+(\S+)\s+(\d+)$/);
	if (!match) return;
	const memberUid = await resolvePositionTarget(bid, match[2], mention);
	const position = Number(match[3]);
	let data;
	try {
		const result = await runRobotBusiness(e, "teams.position", {
			...memberUid ?? {},
			position: position.toString()
		}, (value) => parseBackendTeamWorkflow(value, "position"), next);
		if (result.handled) return;
		data = result.data;
		if (!("outcome" in data)) throw new Error("队伍操作响应不完整");
	} catch (error) {
		logger.error(error);
		const md = Format.createMarkdown();
		md.addText(error instanceof Error ? error.message : "设置失败");
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
	if (position < 1 || position > 6) {
		const md = Format.createMarkdown();
		md.addText("位置序号必须在1-6之间");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText("位置设置成功！");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };