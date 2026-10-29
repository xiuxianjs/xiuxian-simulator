import { parseGuildLeaveCancel } from "../../../api/bot/guild-leave-confirmation-cancel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/cancelLeave/res.ts
/**
* 取消退出宗门指令响应处理
* 指令格式: /取消退出宗门
* 主动取消退出宗门的二次确认
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const send = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text),
			footer: [{
				label: "返回宗门",
				command: "/我的宗门"
			}]
		}));
	};
	try {
		if ((await runRobotBusiness(e, "guild.leave-cancel", {}, parseGuildLeaveCancel, next, async (reply) => {
			await send(reply.text);
		})).handled) return;
		await send("✅ 已取消退出宗门操作");
	} catch (error) {
		await send(error instanceof Error ? error.message : "取消操作失败");
	}
});

//#endregion
export { res_default as default };