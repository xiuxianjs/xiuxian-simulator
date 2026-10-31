import { markdownButtonLabel } from "./buttonLabel.js";
import { compactButtonSpacing } from "./compactButtonSpacing.js";
import { isPrivateEvent } from "./privateEvent.js";
import { Format, getCurrentEvent } from "alemonjs";

//#region src/utils/messageHelper.ts
/** 消息发送辅助工具：统一处理文本、分页和按钮。 */
/**
* 仅限qq-bot使用
* @param md
* @param buttons
*/
const addOptions = (md, buttons) => {
	for (const btn of buttons) {
		md.addText(" ");
		md.addButton(markdownButtonLabel(`${btn.label}`), {
			data: btn.command,
			...btn.autoEnter === void 0 ? {} : { autoEnter: btn.autoEnter }
		});
	}
	md.addNewline();
	return md;
};
/**
* 创建完整引用块的内部 Markdown。
* 同一对象的多行信息与局部操作必须写入该对象的同一个引用块。
*/
const createQuoteMarkdown = (lines, buttons = []) => {
	const quoteMd = Format.createMarkdown();
	lines.forEach((line, index) => {
		if (index > 0) quoteMd.addNewline();
		quoteMd.addText(line);
	});
	if (buttons.length > 0) addOptions(quoteMd, buttons);
	return quoteMd;
};
/**
* 创建进度
* @param params
* @returns
*/
const createProgress = (params) => {
	const { currentIndex, meridians } = params;
	const current = meridians[currentIndex];
	const progressRatio = current.requiredProgress > 0 ? current.progress / current.requiredProgress : 0;
	const progressBar = Math.max(0, Math.min(10, Math.floor(progressRatio * 10)));
	return `${"▓".repeat(progressBar) + "░".repeat(10 - progressBar)} ${Math.max(0, Math.min(100, Math.floor(progressRatio * 100)))}%`;
};
const isFooterRows = (footer) => {
	return Array.isArray(footer) && footer.length > 0 && Array.isArray(footer[0]);
};
const normalizeFooterRows = (footer) => {
	if (isFooterRows(footer)) return footer.filter((row) => row && row.length > 0);
	return footer.length > 0 ? [footer] : [];
};
/**
* qq-bot 风格说明
┌─────────────────────────────────┐
│ 宗门成员列表                      │
│ 【1】张三 -筑基期 [查看][踢出]     │
│  >贡献:1234    │
│ 【2】张三 -筑基期 [查看][踢出]     │
│  >贡献:1234    │
│ 【3】张三 -筑基期 [查看][踢出]     │
│  >贡献:1234    │
│ 第1/3页，共12条 [上一页] [下一页] │
├─────────────────────────────────┤
│ [1][2][3][4][5][6]              │ footer，某bar主题下的其他功能
├─────────────────────────────────┤
│ [我][战][本][动][店][包]          │ bar 每个消息固定的操作。
└─────────────────────────────────┘
*/
/**
* 新Format构建器gui
* 语意和阅读行更好
* 能使用 md.addButton 来添加按钮，按钮和文本可以混排
* @param params
* @returns
*/
const FormatGui = (params) => {
	const format = Format.create();
	const { isPrivate, bid, mention = true, title, header, content, nav, footer, keyboard, bar } = params;
	let md = Format.createMarkdown();
	if (!isPrivate && !isPrivateEvent(getCurrentEvent()) && bid && mention) {
		md.addMention(bid);
		md.addNewline();
	}
	if (title) {
		md.addBold(title);
		md.addNewline();
	}
	if (header && header.length > 0) {
		md.addNewline();
		header.forEach((btn, index) => {
			if (index > 0) md.addText(" ");
			if (!btn.command) md.addText(btn.selected ? markdownButtonLabel(btn.label, true) : btn.label);
			else md.addButton(markdownButtonLabel(btn.label, btn.selected), {
				data: btn.command,
				...btn.autoEnter === void 0 ? {} : { autoEnter: btn.autoEnter }
			});
		});
		md.addNewline();
	}
	if (Array.isArray(content)) {
		if (md.value.value.length > 0) format.addMarkdown(md);
		format.value.push(...content);
		md = Format.createMarkdown();
	} else if (content) md.absorb(content);
	if (nav) {
		md.addNewline();
		const countText = nav.count !== void 0 ? `，共${nav.count}条` : "";
		md.addText(`${nav.total === void 0 ? `第${nav.current}页` : `第${nav.current}/${nav.total}页`}${countText} `);
		if (nav.current > 1) {
			md.addText(" ");
			md.addButton(markdownButtonLabel("上一页"), {
				data: nav.command.replace("{page}", String(nav.current - 1)),
				...nav.autoEnter === void 0 ? {} : { autoEnter: nav.autoEnter }
			});
		}
		if (nav.total === void 0 ? nav.hasNext === true : nav.current < nav.total) {
			if (nav.current > 1) md.addText(" ");
			md.addButton(markdownButtonLabel("下一页"), {
				data: nav.command.replace("{page}", String(nav.current + 1)),
				...nav.autoEnter === void 0 ? {} : { autoEnter: nav.autoEnter }
			});
		}
		md.addNewline();
	}
	if (footer && footer.length > 0) {
		normalizeFooterRows(footer).forEach((row) => {
			if (row.length === 0) return;
			md.addNewline();
			row.forEach((btn, index) => {
				if (index > 0) md.addText(" ");
				if (!btn.command?.trim()) md.addText(btn.selected ? markdownButtonLabel(btn.label, true) : btn.label);
				else md.addButton(markdownButtonLabel(btn.label, btn.selected), {
					data: btn.command,
					...btn.autoEnter === void 0 ? {} : { autoEnter: btn.autoEnter }
				});
			});
		});
		md.addNewline();
	}
	const bt = Format.createButtonGroup();
	const keyboardRows = keyboard ? normalizeFooterRows(keyboard) : [];
	keyboardRows.forEach((row) => {
		bt.addRow();
		row.forEach((btn) => {
			bt.addButton(btn.label, btn.command ?? "", { type: btn.type ?? "command" });
		});
	});
	const bottomBar = bar === false ? [] : bar ?? [
		{
			label: "我",
			command: "/我"
		},
		{
			label: "战",
			command: "/属性面板"
		},
		{
			label: "本",
			command: "/查看主线"
		},
		{
			label: "动",
			command: "/我的活动"
		},
		{
			label: "店",
			command: "/商店"
		}
	];
	if (bottomBar.length > 0) {
		bt.addRow();
		bottomBar.slice(0, 5).forEach((btn) => {
			if (btn.type === "link") bt.addButton(markdownButtonLabel(btn.label), btn.command ?? "", { type: "link" });
			else bt.addButton(btn.label, btn.command ?? "");
		});
	}
	if (md.value.value.length > 0) format.addMarkdown(md);
	if (keyboardRows.length > 0 || bottomBar.length > 0) format.addButtonGroup(bt);
	return { format: compactButtonSpacing(format) };
};

//#endregion
export { FormatGui, addOptions, createProgress, createQuoteMarkdown, normalizeFooterRows };