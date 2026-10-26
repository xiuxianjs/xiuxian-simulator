//#region src/api/bot/onboarding.ts
function parseOnboarding(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("教学状态响应不完整");
	const row = value;
	const lines = (v) => Array.isArray(v) && v.every((line) => typeof line === "string");
	if (![
		"absent",
		"active",
		"soft",
		"completed",
		"exited"
	].includes(String(row.status)) || typeof row.phase !== "string" || typeof row.title !== "string" || !Number.isSafeInteger(row.version) || Number(row.version) < 0 || row.choiceBound !== void 0 && typeof row.choiceBound !== "boolean" || row.choiceBound === true && (row.status !== "completed" || Number(row.version) < 1) || !lines(row.lines) || !lines(row.feedback) || !Array.isArray(row.actions) || row.actions.length > 2 || !row.actions.every((action) => action && typeof action === "object" && typeof action.label === "string" && typeof action.command === "string")) throw new Error("教学状态字段不完整");
	return row;
}

//#endregion
export { parseOnboarding };