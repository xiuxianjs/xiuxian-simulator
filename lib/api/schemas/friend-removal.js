//#region src/api/schemas/friend-removal.ts
function parseDeleteFriendResult(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("删除好友响应不完整");
	const row = value;
	if (typeof row.outcome !== "string" || ![
		"removed",
		"self",
		"not_friend",
		"companion",
		"locked",
		"failed"
	].includes(row.outcome) || row.realmName !== null && typeof row.realmName !== "string") throw new Error("删除好友响应不完整");
	return row;
}

//#endregion
export { parseDeleteFriendResult };