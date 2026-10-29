import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotCompetitionTeamAction } from "../../../api/bot/competition-team-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/apply/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const send = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		md.addNewline();
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 - 报名",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md,
			footer: [{
				label: "宗门大比",
				command: "/宗门大比"
			}]
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.apply", {}, (value) => parseRobotCompetitionTeamAction(value), next, async (reply) => {
		await send(reply.text);
	}).catch(async (error) => {
		await send(error instanceof Error ? error.message : "报名失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	await send(loaded.data.message);
});

//#endregion
export { res_default as default };