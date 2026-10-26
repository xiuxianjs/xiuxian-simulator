import { parseBackendGuilds } from "./queries.js";

//#region src/api/bot/guild-directory-robot-query.ts
function parseRobotGuildList(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门列表数据不完整");
	const data = value;
	if (typeof data.canCreateOrApplyGuild !== "boolean" || typeof data.redirected !== "boolean") throw new Error("宗门列表缺少状态");
	return {
		result: data.result === null ? null : parseBackendGuilds(data.result),
		canCreateOrApplyGuild: data.canCreateOrApplyGuild,
		redirected: data.redirected
	};
}

//#endregion
export { parseRobotGuildList };