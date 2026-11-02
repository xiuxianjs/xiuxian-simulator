import { addOptions } from "../../utils/messageHelper.js";
import { STATUS_SYMBOL } from "./tokens.js";
import { Format } from "alemonjs";

//#region src/response/presentation/sections.ts
/**
* 引用块：一个对象/一个分组。
* 顺序固定为「对象行（加粗）→ #编号 → 状态符号 → 对象标记 → 事实行 → 行内按钮」。
*/
const section = (input) => {
	const md = Format.createMarkdown();
	const status = input.status ?? "none";
	const symbol = status === "none" ? "" : STATUS_SYMBOL[status];
	const lines = input.lines.length > 0 && !input.title && symbol ? [`${symbol} ${input.lines[0]}`, ...input.lines.slice(1)] : input.lines;
	if (input.title) {
		md.addBold(input.title);
		if (input.id !== void 0 && input.id !== "") md.addText(` #${input.id}`);
		if (symbol) md.addText(` ${symbol}`);
		if (input.suffix) md.addText(` ${input.suffix}`);
		if (lines.length > 0) md.addNewline();
	} else if (symbol && lines.length === 0) md.addText(symbol);
	lines.forEach((line, index) => {
		if (index > 0) md.addNewline();
		md.addText(line);
	});
	if (input.actions && input.actions.length > 0) {
		md.addNewline();
		addOptions(md, input.actions);
	}
	return md;
};

//#endregion
export { section };