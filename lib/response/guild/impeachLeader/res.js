import { parseRobotGuildImpeach } from "../../../api/bot/guild-leadership-end-robot-query.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/impeachLeader/res.ts
/**
* 弹劾宗主
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendText = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "guild.impeach", {}, parseRobotGuildImpeach, next, async (reply) => {
			await sendText(reply.text);
		});
		if (loaded.handled) return;
		await sendText(loaded.data.message);
	} catch (error) {
		await sendText(error instanceof Error ? error.message : "弹劾失败");
	}
});

//#endregion
export { res_default as default };