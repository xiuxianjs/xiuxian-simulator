import { getAppConfig } from "../../utils/appConfig.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseBackendNavigation } from "../../api/bot/navigation.js";
import App, { MORE_PAGE_SIZE, parseMoreNavigation } from "../../response-apps/more/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/more/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const [, parentNext] = useEvent();
	let access;
	try {
		const result = await runRobotBusiness(e, "navigation.more", {}, parseBackendNavigation, parentNext);
		if (result.handled) return;
		access = result.data;
	} catch {
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "导航",
			content: Format.createMarkdown().addText("导航获取失败，请稍后再试。")
		}));
		return;
	}
	const visibleCommands = access.registered ? [...access.moreVisibleCommands, ...access.foldVisibleCommands] : access.moreVisibleCommands;
	const { categories } = App(visibleCommands).data;
	const selection = parseMoreNavigation(e.MessageText ?? "");
	const category = categories.find((item) => item.name === selection.category);
	const md = Format.createMarkdown();
	const addEntry = (label, description, command) => {
		const row = Format.createMarkdown().addButton(markdownButtonLabel(`${label}`), { data: command }).addText(` — ${description}`);
		md.addBlockquote(row);
	};
	if (!category) {
		if (selection.category) {
			md.addText("此处暂无可阅名目，请择下方入口。");
			md.addNewline();
		}
		for (const item of categories.filter((item) => !item.parent)) addEntry(item.displayName ?? item.name, item.description, `/更多 ${item.name}`);
		if (!categories.length) md.addText("尚未踏入仙途，可先查看问道指南。");
	} else {
		const total = Math.max(1, Math.ceil(category.entries.length / 6));
		const current = Math.min(selection.page, total);
		for (const entry of category.entries.slice((current - 1) * 6, current * 6)) addEntry(entry.label, entry.description, entry.command);
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: category.displayName ?? category.name,
			content: md,
			header: [
				{
					label: category.parent ? `回${categories.find((item) => item.name === category.parent)?.displayName ?? category.parent}` : "回仙途百事",
					command: category.parent ? `/更多 ${category.parent}` : "/更多"
				},
				...categories.filter((item) => item.parent && item.parent === category.parent).map((item) => ({
					label: item.displayName ?? item.name,
					selected: item.name === category.name,
					command: `/更多 ${item.name}`
				})),
				{
					label: "登录",
					command: "/登录"
				}
			],
			nav: total > 1 ? {
				current,
				total,
				command: `/更多 ${category.name} {page}`
			} : void 0
		}));
		return;
	}
	const configuredGroupUrl = getAppConfig().official_group_url;
	const officialGroupUrl = (typeof configuredGroupUrl === "string" ? configuredGroupUrl.trim() : "") || "https://qm.qq.com/q/vdFtnG7SEK";
	const reply = FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "仙途百事",
		header: [{
			label: "安全中心",
			command: "/安全中心"
		}, {
			label: "登录",
			command: "/登录"
		}],
		footer: [{
			label: "我的设置",
			command: "/我的设置"
		}, {
			label: "任务设置",
			command: "/任务设置"
		}],
		content: md,
		keyboard: [{
			label: "加入群聊",
			command: officialGroupUrl,
			type: "link"
		}]
	});
	message.send(reply);
});

//#endregion
export { res_default as default };