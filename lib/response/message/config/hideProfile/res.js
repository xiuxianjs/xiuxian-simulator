import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { selects } from "../../../config.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/message/config/hideProfile/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").match(/^(!|！|\/|#|＃)?配置信息隐藏\s+(开启|关闭)$/);
	{
		const enabled = match?.[2] === "开启";
		const loaded = await runRobotBusiness(e, "settings.hide-profile", { value: enabled }, (value) => {
			if (!value || typeof value !== "object" || !("hideProfile" in value) || typeof value.hideProfile !== "boolean") throw new Error("设置响应不完整");
			return value;
		}, next);
		if (loaded.handled) return;
		const result = {
			code: "OK",
			data: {
				type: "HIDE_PROFILE",
				enabled: loaded.data.hideProfile
			}
		};
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
		if (result.data.type !== "HIDE_PROFILE") {
			md.addText("设置配置失败");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		md.addText(`个人信息隐藏已${result.data.enabled ? "开启" : "关闭"}`);
		md.addNewline();
		md.addText(result.data.enabled ? "其他玩家查看你的信息时将只能看到基本信息。" : "其他玩家可以查看你的详细属性信息。");
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