import { requestBackend } from "./client.js";

//#region src/api/bot/guild-role-options-queries.ts
async function getBackendGuildRoleOptions(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildRoleOptions(await requestBackend(bid, "get_players_id_guild_role_options", { path: { id: uid } }));
}
function parseGuildRoleOptions(value) {
	const v = value;
	if (!v || ![
		"not_joined",
		"guild_missing",
		"members_missing",
		"joined"
	].includes(v.membershipStatus) || typeof v.guildName !== "string" || !Array.isArray(v.members) || !Array.isArray(v.kickableMembers) || !Array.isArray(v.roles) || !v.roles.every((r) => r && Number.isSafeInteger(r.id) && typeof r.name === "string") || !v.members.every((m) => Array.isArray(m?.appointableRoles) && m.appointableRoles.every((r) => r && Number.isSafeInteger(r.id) && typeof r.name === "string")) || ![...v.members, ...v.kickableMembers].every((m) => m && Number.isSafeInteger(m.userId) && typeof m.userExists === "boolean" && typeof m.isDeputy === "boolean" && [
		m.name,
		m.realmName,
		m.roleName
	].every((x) => x === null || typeof x === "string"))) throw new Error("宗门职位接口数据不完整");
	return v;
}

//#endregion
export { getBackendGuildRoleOptions, parseGuildRoleOptions };