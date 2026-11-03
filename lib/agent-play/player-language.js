//#region src/agent-play/player-language.ts
/** Translate known display fields only; never reinterpret command payloads or code. */
function playerLanguage(text) {
	return text.replace(/(\[\[[^\n]*?\]\]|```[\s\S]*?```)|["']?\b(claimed|unlocked)\b["']?\s*[:=]\s*(true|false)\b/gu, (match, protectedText, field, value) => {
		if (protectedText) return match;
		if (field === "claimed") return value === "true" ? "已领取" : "尚未领取";
		return value === "true" ? "已解锁" : "尚未解锁";
	});
}

//#endregion
export { playerLanguage };