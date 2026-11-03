//#region src/agent-play/dialogue-options.ts
/** Slash units and ratios are facts, not instructions to send a command. */
const isDialogueCommandInstruction = (line) => /^(?:可选)?指令[：:]|^\s*(?:>\s*|[-*]\s+)?[`「“]?\/[\p{Script=Han}]/u.test(line) || /(?:发送|输入|执行|点击|先发|再发)\s*[`「“]?\/[\p{Script=Han}]|\s·\s*\/[\p{Script=Han}]/u.test(line);
/** Keep the server command intact except for its leading slash. Never shorten a payload. */
function dialogueOptionText(option) {
	const command = option.command?.trim();
	const embedded = option.label.match(/\s*·\s*(\/[^\n\r]+)$/u)?.[1];
	const original = command ?? embedded;
	if (original?.startsWith("/") && [...original].length <= 80 && !/[\n\r[\]]/u.test(original)) {
		const input = original.slice(1);
		if (input && !/^[/#!！＃]/u.test(input) && !input.includes("/")) return input;
	}
	return option.label.split(/\s*·\s*[/]/u)[0].trim();
}
/** Match only labels from this receipt. Duplicate names are not enough to select a branch. */
function normalizeDialogueOptions(reply, options) {
	const aliases = /* @__PURE__ */ new Map();
	for (const option of options) {
		const canonical = dialogueOptionText(option);
		for (const label of [
			option.label,
			option.label.split(/\s*·\s*[/]/u)[0].trim(),
			canonical
		]) {
			const values = aliases.get(label) ?? /* @__PURE__ */ new Set();
			values.add(canonical);
			aliases.set(label, values);
		}
	}
	return reply.replace(/\[\[([^\]\n[]{1,80})\]\]/gu, (marker, label) => {
		const values = aliases.get(label.trim());
		return values?.size === 1 ? `[[${[...values][0]}]]` : marker;
	});
}

//#endregion
export { dialogueOptionText, isDialogueCommandInstruction, normalizeDialogueOptions };