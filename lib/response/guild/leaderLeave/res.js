import { parseRobotGuildLeaderLeave } from "../../../api/bot/guild-leave-robot-query.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/leaderLeave/res.ts
/**
* 宗主请假（固定3天）
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const loaded = await runRobotBusiness(e, "guild.leader-leave", {}, parseRobotGuildLeaderLeave, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(loaded.data.message)
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "请假失败")
		}));
	}
});

//#endregion
export { res_default as default };