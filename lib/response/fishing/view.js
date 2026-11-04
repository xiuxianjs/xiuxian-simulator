import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/fishing/view.ts
const manual = (actions) => actions.map((action) => ({
	...action,
	autoEnter: false
}));
const footerRows = (data, actions) => {
	const width = data.view === "overview" ? 3 : 4;
	return actions.length > width ? [manual(actions.slice(0, width)), manual(actions.slice(width))] : manual(actions);
};
/** Text facts and asset choices stay authoritative on the service. */
function fishingBubble(data, event, confirmationCommand) {
	const md = Format.createMarkdown();
	const buttons = (target, actions) => {
		actions.forEach((action) => {
			target.addText(" ");
			target.addButton(markdownButtonLabel(action.label), {
				data: action.command,
				autoEnter: false
			});
		});
	};
	const block = (section, quote, inline = false, titleActions = false, terminal = false) => {
		const target = Format.createMarkdown();
		const title = [
			section.title,
			section.id ? `#${section.id}` : "",
			section.suffix
		].filter(Boolean).join(" ");
		if (title) {
			target.addText(title);
			if (titleActions) buttons(target, section.actions);
			if (section.lines.length) target.addNewline();
		}
		section.lines.forEach((line, index) => {
			if (index) target.addNewline();
			target.addText(line);
			if (inline && section.actions[index]) buttons(target, [section.actions[index]]);
		});
		const rest = titleActions ? [] : inline ? section.actions.slice(section.lines.length) : section.actions;
		if (rest.length) {
			if (title || section.lines.length) target.addNewline();
			buttons(target, rest);
		}
		if (quote) md.addBlockquote(target);
		else md.absorb(target);
		if (!quote && !terminal) {
			md.addNewline();
			if (section.lines.length) md.addNewline();
		}
	};
	let footer = data.footer;
	if (data.view === "overview" && data.sections.length === 4) data.sections.forEach((section, index) => {
		if (index === 3) {
			section.lines.forEach((line, i) => {
				if (i) md.addNewline();
				md.addText(line);
			});
			section.actions.forEach((action) => {
				md.addNewline();
				buttons(md, [action]);
			});
		} else block(section, index === 1 || index === 2, true);
	});
	else if (data.view === "rod-upgrade-preview" && data.sections.length === 3) data.sections.forEach((section, index) => block(section, index === 1, false, false, index === 2));
	else if (data.view === "blessing") data.sections.forEach((section) => block(section, Boolean(section.title), false, Boolean(section.title)));
	else if (data.view === "shop") {
		const modeActions = data.navRows?.flat().filter((action) => ["转为出售", "转为购买"].includes(action.label)) ?? [];
		if (data.sections[0]) block(data.sections[0], false);
		if (modeActions.length) {
			buttons(md, modeActions);
			md.addNewline().addNewline();
		}
		const tabs = footer.filter((action) => [
			"灵鳞钱",
			"灵石",
			"灵晶",
			"道晶"
		].includes(action.label));
		const categories = [
			"饵料",
			"窝料",
			"钓具",
			"渔具",
			"素材",
			"鱼类"
		];
		const serverCategories = data.navRows?.flat().filter((action) => categories.includes(action.label)) ?? [];
		buttons(md, serverCategories.length ? serverCategories : categories.slice(0, 5).map((label, index) => ({
			label,
			command: `/垂钓 渔市 ${[
				"bait",
				"chum",
				"rod",
				"net",
				"material"
			][index]} 1`
		})));
		md.addNewline().addNewline();
		data.sections.slice(1).forEach((section) => block(section, true));
		footer = footer.filter((action) => !tabs.includes(action));
	} else data.sections.forEach((section) => block(section, Boolean(section.title || section.id || data.confirmationRef)));
	if (data.confirmationRef) {
		const command = confirmationCommand ?? `/垂钓 确认 ${data.confirmationRef}`;
		footer = [footer.find((action) => action.command === command) ?? {
			label: "确认",
			command
		}, footer.find((action) => action.label.includes("取消")) ?? {
			label: "取消",
			command: "/垂钓"
		}];
		if (data.view !== "rod-upgrade-preview" && !data.sections.some((section) => section.lines.some((line) => /5分钟|有效期|有效.*分钟/.test(line)))) md.addText("预览有效5分钟，确认后按本次原预览结算。").addNewline();
	}
	return FormatGui({
		bid: event.UserId,
		isPrivate: isPrivateEvent(event),
		title: data.title,
		content: md,
		nav: data.nav ? {
			current: data.nav.page,
			total: data.nav.totalPages,
			count: data.nav.total,
			command: data.nav.command,
			autoEnter: false
		} : void 0,
		footer: footerRows(data, footer),
		bar: false
	});
}

//#endregion
export { fishingBubble };