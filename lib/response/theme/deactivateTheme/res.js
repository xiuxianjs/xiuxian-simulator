import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { validateBackendDeactivatedTheme } from "../../../api/bot/theme-state.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/theme/deactivateTheme/res.ts
/**
* 关闭主题指令
* 指令：/关闭主题
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	if ((await runRobotBusiness(e, "themes.deactivate", {}, validateBackendDeactivatedTheme, next)).handled) return;
	const md = Format.createMarkdown();
	md.addText("已关闭当前主题，恢复默认外观。");
	md.addNewline();
	md.addButton(markdownButtonLabel("我的主题"), { data: "/我的主题" });
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "关闭主题",
		content: md
	}));
});

//#endregion
export { res_default as default };