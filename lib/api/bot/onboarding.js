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
	].includes(String(row.status)) || typeof row.phase !== "string" || typeof row.title !== "string" || !Number.isSafeInteger(row.version) || Number(row.version) < 0 || row.choiceBound !== void 0 && typeof row.choiceBound !== "boolean" || row.choiceBound === true && (row.status !== "completed" || Number(row.version) < 1) || !lines(row.lines) || !lines(row.feedback) || row.branchMenu !== void 0 && (!row.branchMenu || typeof row.branchMenu !== "object" || Array.isArray(row.branchMenu) || !lines(row.branchMenu.lines) || !Array.isArray(row.branchMenu.items) || row.branchMenu.items.length > 128 || !row.branchMenu.items.every((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.description === "string" && typeof item.command === "string" && [...item.command].length <= 80 && typeof item.learned === "boolean")) || row.entries !== void 0 && (!Array.isArray(row.entries) || row.entries.length > 2 || !row.entries.every((entry) => entry && typeof entry.label === "string" && typeof entry.command === "string" && [...entry.command].length <= 80)) || !Array.isArray(row.actions) || row.actions.length > 2 || !row.actions.every((action) => action && typeof action === "object" && typeof action.label === "string" && typeof action.command === "string")) throw new Error("教学状态字段不完整");
	return row;
}

//#endregion
export { parseOnboarding };