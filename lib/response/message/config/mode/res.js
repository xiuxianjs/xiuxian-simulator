import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { selects } from "../../../config.js";
import App from "../../../../response-apps/message/config/enumPreferences/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/message/config/mode/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const modeMatch = (e.MessageText || "").match(/^(!|！|\/|#|＃)?配置秘境模式\s+(自动|手动)$/);
	if (modeMatch) {
		const modeText = modeMatch[2];
		const result = await App({
			event: e,
			next,
			action: {
				type: "DUNGEON_BATTLE_MODE",
				mode: modeText === "自动" ? "auto" : "manual"
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
		if (result.data.type !== "DUNGEON_BATTLE_MODE") {
			md.addText("设置配置失败");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		md.addText(`秘境战斗模式已设置为：${result.data.mode === "auto" ? "自动" : "手动"}`);
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