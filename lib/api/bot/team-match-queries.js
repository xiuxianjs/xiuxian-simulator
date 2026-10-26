import { requestBackend } from "./client.js";
import { parseTeamMatchSnapshot } from "../schemas/team-match-snapshot.js";

//#region src/api/bot/team-match-queries.ts
async function getBackendTeamMatchSnapshot(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendTeamMatchSnapshot(await requestBackend(bid, "get_teams_match_snapshot"));
}
function parseBackendTeamMatchSnapshot(data) {
	if (data === null) return null;
	return parseTeamMatchSnapshot(data, "匹配状态接口数据不完整");
}
async function guardBackendTeamMatchCommand(bid, messageText) {
	return parseBackendTeamMatchCommandGuard(await requestBackend(bid, "post_teams_match_command_guard", { body: { messageText } }));
}
function parseBackendTeamMatchCommandGuard(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("匹配指令判定响应不完整");
	const result = data;
	if (typeof result.blocked !== "boolean") throw new Error("匹配指令判定响应不完整");
	if (result.blocked) parseTeamMatchSnapshot(result.match, "匹配指令判定快照不完整");
	return data;
}

//#endregion
export { getBackendTeamMatchSnapshot, guardBackendTeamMatchCommand, parseBackendTeamMatchCommandGuard, parseBackendTeamMatchSnapshot };