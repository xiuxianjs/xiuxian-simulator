import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { validateBackendThemes } from "../../../api/bot/theme-queries.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/theme/myThemes/res.ts
/**
* 我的主题指令
* 指令：/我的主题
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const result = await runRobotBusiness(e, "themes.overview", {}, validateBackendThemes, next);
	if (result.handled) return;
	const { themes, permission: perm } = result.data;
	const md = Format.createMarkdown();
	if (themes.length === 0) {
		md.addText("尚无任何主题。系统主题由运营发放，自定义主题可在官网开启。");
		md.addNewline();
	} else for (const t of themes) {
		const activeTag = t.isActive ? " ✦" : "";
		const sourceTag = t.source === "custom" ? "[自]" : "";
		const themeMd = Format.createMarkdown().addText(`【${t.id}】${sourceTag} ${t.name}${activeTag} `);
		if (t.isActive) themeMd.addText("使用中");
		else themeMd.addButton(markdownButtonLabel("切换"), { data: `/切换主题 ${t.id}` });
		md.addBlockquote(themeMd);
	}
	md.addNewline();
	md.addText(`自定义：${perm.canCustomEdit ? `${themes.filter((t) => t.source === "custom").length}/${perm.maxCustomSlots}` : "未开放"}`);
	if (perm.requiredVipLevel !== void 0) {
		md.addNewline();
		md.addText(`达到VIP${perm.requiredVipLevel}后开启自定义主题权限`);
	}
	const activeTheme = themes.find((t) => t.isActive);
	let activeConfig = {};
	if (activeTheme) try {
		activeConfig = JSON.parse(activeTheme.config);
	} catch {
		activeConfig = {};
	}
	const currentMode = activeConfig.inkMode === "dark" ? "深底暗黑" : "宣纸水墨";
	if (activeTheme) {
		md.addNewline();
		md.addText(`当前墨色：${currentMode}`);
	}
	const footerRows = [];
	if (activeTheme) footerRows.push([currentMode === "深底暗黑" ? {
		label: "切换宣纸水墨",
		command: "/切换墨色模式 宣纸水墨"
	} : {
		label: "切换深底暗黑",
		command: "/切换墨色模式 深底暗黑"
	}, {
		label: "关闭主题",
		command: "/关闭主题"
	}]);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的主题",
		header: [{
			label: "返回设置",
			command: "/我的设置"
		}],
		content: md,
		footer: footerRows
	}));
});

//#endregion
export { res_default as default };