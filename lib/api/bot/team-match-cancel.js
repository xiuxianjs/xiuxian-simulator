import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-match-cancel.ts
async function cancelBackendTeamMatch(bid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendTeamMatchCancel(await requestBackend(bid, "post_teams_match_cancel", { ...writeContext(request) }));
}
function parseBackendTeamMatchCancel(value) {
	const data = value;
	if (!data || typeof data.cancelled !== "boolean" || (data.cancelled ? typeof data.targetLabel !== "string" : data.targetLabel !== null)) throw new Error("取消匹配响应不完整");
	return data;
}

//#endregion
export { cancelBackendTeamMatch, parseBackendTeamMatchCancel };