import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildUpgrade } from "../../../api/bot/guild-upgrade-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/upgradeVein/res.ts
/**
* 提升宗门灵脉
*/
function appendFormattedMessage(md, text) {
	const paragraphs = text.split("\n").flatMap((line) => line.split(/(?<=[。；])/).map((part) => part.trim()).filter(Boolean));
	paragraphs.forEach((line, index) => {
		md.addText(line);
		if (index < paragraphs.length - 1) md.addNewline();
	});
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendText = async (text) => {
		const md = Format.createMarkdown();
		appendFormattedMessage(md, text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门灵脉升级",
			content: md
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "guild.upgrade-vein", {}, (value) => parseRobotGuildUpgrade(value, "vein"), next, async (reply) => {
			await sendText(reply.text);
		});
		if (loaded.handled) return;
		await sendText(loaded.data.message);
	} catch (error) {
		await sendText(error instanceof Error ? error.message : "灵脉升级失败");
	}
});

//#endregion
export { res_default as default };