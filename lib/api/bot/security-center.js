//#region src/api/bot/security-center.ts
/** Pure projection of the four security-center display fields. */
function parseRobotSecurityCenter(value, uid) {
	const row = value;
	if (row?.playerId !== uid || !Number.isInteger(uid) || uid <= 0 || typeof row.name !== "string" || typeof row.email !== "string" || typeof row.hasPassword !== "boolean") throw new Error("安全中心响应不完整");
	return {
		name: row.name,
		id: uid,
		email: row.email || null,
		hasPassword: row.hasPassword
	};
}

//#endregion
export { parseRobotSecurityCenter };