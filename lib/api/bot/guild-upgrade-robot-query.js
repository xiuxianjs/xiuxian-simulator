import { parseGuildUpgrade } from "./guild-upgrade.js";

//#region src/api/bot/guild-upgrade-robot-query.ts
function parseRobotGuildUpgrade(value, kind) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门升级响应不完整");
	const row = value;
	const receipt = parseGuildUpgrade(row.receipt, kind);
	if (typeof row.message !== "string" || !row.message) throw new Error("宗门升级响应不完整");
	return {
		receipt,
		message: row.message
	};
}

//#endregion
export { parseRobotGuildUpgrade };