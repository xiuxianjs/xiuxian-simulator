import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { selects } from "../../../config.js";
import App from "../../../../response-apps/message/config/teamPreferences/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/message/config/energy/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const teamMentalMatch = (e.MessageText || "").match(/^(!|！|\/|#|＃)?配置组队精力\s+(消耗|不消耗)$/);
	if (teamMentalMatch) {
		const result = await App({
			event: e,
			next,
			action: {
				type: "TEAM_DUNGEON_NO_MENTAL",
				enabled: teamMentalMatch[2] === "不消耗"
			}
		});
		if (!result) return;
		const md = Format.createMarkdown();
		if (result.code !== "OK") {
			md.addText("设置配置失败");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (result.data.type !== "TEAM_DUNGEON_NO_MENTAL") {
			md.addText("设置配置失败");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		md.addText(`组队精力已设置为：${result.data.enabled ? "不消耗" : "消耗"}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };