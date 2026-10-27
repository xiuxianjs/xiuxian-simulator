import { formatGameTime } from "../../utils/gameTime.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/guild-application-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门申请接口数据不完整");
	return value;
}
const nullableName = (value) => value === null || typeof value === "string";
async function getBackendGuildApplications(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildApplications(await requestBackend(bid, "get_players_id_guild_applications", { path: { id: uid } }));
}
function parseGuildApplications(value) {
	const data = record(value);
	if (typeof data.hasGuild !== "boolean" || !nullableName(data.guildName) || typeof data.guildNameText !== "string" || !Array.isArray(data.applications)) throw new Error("宗门申请接口数据不完整");
	for (const value of data.applications) {
		const row = record(value);
		if (!Number.isSafeInteger(row.id) || Number(row.id) < 1 || !Number.isSafeInteger(row.guildId) || Number(row.guildId) < 1 || row.status !== 0 || !nullableName(row.guildName) || row.createdAt !== null && (typeof row.createdAt !== "string" || !Number.isFinite(new Date(row.createdAt).getTime())) || typeof row.guildNameText !== "string" || typeof row.statusText !== "string" || typeof row.createdDateText !== "string" || typeof row.canCancel !== "boolean") throw new Error("宗门申请接口数据不完整");
	}
	const result = data;
	return {
		...result,
		applications: result.applications.map((row) => ({
			...row,
			createdDateText: formatGameTime(row.createdAt)
		}))
	};
}

//#endregion
export { getBackendGuildApplications, parseGuildApplications };