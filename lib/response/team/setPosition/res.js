import { FormatGui } from "../../../utils/messageHelper.js";
import { buildBubble } from "../../presentation/bubble.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseBackendTeamWorkflow } from "../../../api/bot/social-workflows.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseTargetSuggestions, targetSuggestionsBubble } from "../../targetSuggestions.js";
import { resolvePositionTarget } from "../../../utils/teamTarget.js";
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
	const args = e.MessageText.trim().replace(/^[!！/#＃]?队伍位置设置(?:\s+|$)/, "").split(/\s+/).filter(Boolean);
	if (!args.length) {
		await message.send(buildBubble({
			isPrivate,
			bid,
			title: "选择队伍站位",
			sections: [[
				1,
				2,
				3
			], [
				4,
				5,
				6
			]].map((positions) => ({
				lines: [],
				actions: positions.map((position) => ({
					label: `${position}号位`,
					command: `/队伍位置设置 ${position}`
				}))
			}))
		}));
		return;
	}
	const positionText = args.at(-1) ?? "";
	const position = Number(positionText);
	if (args.length > 2 || !/^\d+$/.test(positionText) || args.length === 1 && (position < 1 || position > 6)) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText("位置序号必须在1-6之间")
		}));
		return;
	}
	const memberUid = args.length === 2 ? await resolvePositionTarget(bid, args[0], mention) : null;
	let data;
	try {
		const result = await runRobotBusiness(e, "teams.position", {
			...memberUid ?? {},
			position: position.toString(),
			suggestTargets: true
		}, (value) => parseTargetSuggestions(value, (raw) => parseBackendTeamWorkflow(raw, "position")), next);
		if (result.handled) return;
		if (result.data.mode === "suggestions") {
			await message.send(targetSuggestionsBubble(e, "队伍位置设置", result.data.ids, result.data.reason, position));
			return;
		}
		data = result.data.result;
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
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText("位置序号必须在1-6之间")
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