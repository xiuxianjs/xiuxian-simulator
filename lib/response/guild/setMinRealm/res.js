import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildSetting } from "../../../api/bot/guild-settings-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/setMinRealm/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?设置申请宗门最低境界\s+(.+)$/);
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: Format.createMarkdown().addText(text)
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.min-realm", { searchTerm: match ? match[1].trim() : null }, (value) => parseRobotGuildSetting(value, "min-realm"), next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		if (loaded.data.outcome === "usage") {
			const md = Format.createMarkdown().addText("使用方法：设置申请宗门最低境界 境界名称");
			md.addNewline();
			md.addText("例如：设置申请宗门最低境界 金丹期");
			md.addNewline();
			md.addText("取消限制：设置申请宗门最低境界 无");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		send(loaded.data.message);
	} catch (error) {
		await send(error instanceof Error ? error.message : "设置失败");
	}
});

//#endregion
export { res_default as default };