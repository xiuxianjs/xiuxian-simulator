//#region src/api/schemas/team-match-snapshot.ts
function parseTeamMatchSnapshot(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	const data = value;
	if (typeof data.targetLabel !== "string" || !Number.isSafeInteger(data.waitedSeconds) || Number(data.waitedSeconds) < 0 || !Number.isSafeInteger(data.timeoutSeconds) || Number(data.timeoutSeconds) < 0 || typeof data.phase !== "string" || ![
		"WAITING",
		"SAME_REALM",
		"ADJACENT_REALM",
		"NEAREST_REALM"
	].includes(data.phase)) throw new Error(message);
	return data;
}

//#endregion
export { parseTeamMatchSnapshot };