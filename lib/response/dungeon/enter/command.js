//#region src/response/dungeon/enter/command.ts
function parseDungeonCommand(messageText) {
	const cleaned = (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?\s*/, "");
	if (!cleaned.startsWith("秘境挑战")) return {
		ok: false,
		isCommand: false,
		message: ""
	};
	const dungeonName = cleaned.slice(4).trim();
	return dungeonName ? {
		ok: true,
		dungeonName
	} : {
		ok: false,
		isCommand: true,
		message: "请输入秘境名称"
	};
}

//#endregion
export { parseDungeonCommand };