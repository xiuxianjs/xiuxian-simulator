import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-realm-update.ts
async function updateBackendTeamRealm(bid, uid, realmName, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseTeamRealmUpdate(await requestBackend(bid, "patch_players_id_team_min_realm", {
		path: { id: uid },
		body: { realmName },
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseTeamRealmUpdate(data) {
	const result = data;
	if (!result || ![
		"updated",
		"cancel_noop",
		"realm_not_found",
		"not_in_team",
		"not_leader"
	].includes(result.outcome) || result.outcome === "updated" && result.realmId === null || result.outcome === "cancel_noop" && result.realmId !== null || result.realmId !== null && (!Number.isFinite(result.realmId) || !Number.isInteger(result.realmId) || result.realmId < 0)) throw new Error("队伍境界设置响应不完整");
	return result;
}

//#endregion
export { parseTeamRealmUpdate, updateBackendTeamRealm };