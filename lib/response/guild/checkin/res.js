import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotGuildCheckin } from "../../../api/bot/guild-daily-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/checkin/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const feedback = async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: Format.createMarkdown().addText(reply.text),
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "guild.checkin", {}, parseRobotGuildCheckin, next, feedback);
		if (loaded.handled) return;
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(loaded.data.data.message)
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "签到失败")
		}));
	}
});

//#endregion
export { res_default as default };