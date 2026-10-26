//#region src/utils/buttonLabel.ts
/** Markdown 内联操作统一使用单尖引号，兼容服务端返回的旧方括号标题。 */
function markdownButtonLabel(label, selected = false) {
	let text = label.trim().replace(/\[/g, "‹").replace(/\]/g, "›");
	while (text.startsWith("‹") && text.endsWith("›")) text = text.slice(1, -1).trim();
	return `‹${selected && !text.startsWith("▸") ? "▸" : ""}${text}›`;
}

//#endregion
export { markdownButtonLabel };