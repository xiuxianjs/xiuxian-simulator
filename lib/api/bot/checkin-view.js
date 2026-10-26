//#region src/api/bot/checkin-view.ts
const record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function buttons(value) {
	if (!Array.isArray(value)) throw new Error("签到日历按钮不完整");
	return value.map((row) => {
		if (!record(row) || typeof row.label !== "string" || typeof row.command !== "string" || !row.command.startsWith("/") || [...row.command].length > 80) throw new Error("签到日历按钮无效");
		return {
			label: row.label,
			command: row.command
		};
	});
}
function parseCheckInView(value) {
	if (!record(value) || typeof value.title !== "string" || !Array.isArray(value.blocks)) throw new Error("签到日历响应不完整");
	return {
		title: value.title,
		blocks: value.blocks.map((row) => {
			if (!record(row) || typeof row.text !== "string") throw new Error("签到日历内容不完整");
			return {
				text: row.text,
				buttons: buttons(row.buttons)
			};
		}),
		buttons: buttons(value.buttons)
	};
}

//#endregion
export { parseCheckInView };