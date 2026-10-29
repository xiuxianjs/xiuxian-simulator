import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { validateBackendActivatedTheme } from "../../../api/bot/theme-state.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/theme/activateTheme/res.ts
/**
* 切换主题指令
* 指令：/切换主题 <id>
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").trim().replace(/^(!|！|\/|#|＃)?/, "").match(/^切换主题\s+(\d+)$/);
	const themeId = match ? parseInt(match[1], 10) : NaN;
	const md = Format.createMarkdown();
	if (!themeId || isNaN(themeId)) {
		md.addText("指令格式：/切换主题 <主题ID>");
		md.addNewline();
		md.addButton(markdownButtonLabel("我的主题"), { data: "/我的主题" });
	} else {
		if (!Number.isFinite(themeId)) throw new Error("主题编号超出可查询范围");
		const response = await runRobotBusiness(e, "themes.activate", { themeId }, (data) => validateBackendActivatedTheme(data, themeId), next);
		if (response.handled) return;
		const result = response.data;
		const msg = result.outcome === "activated" ? `已切换到主题「${result.name}」` : result.outcome === "not_found" ? "主题不存在或无权访问" : "切换失败";
		md.addText(msg);
		md.addNewline();
		md.addButton(markdownButtonLabel("我的主题"), { data: "/我的主题" });
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "切换主题",
		content: md
	}));
});

//#endregion
export { res_default as default };