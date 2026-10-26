import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/block-user-by-name.ts
async function blockBackendUserByName(bid, uid, targetName, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendBlockUser(await requestBackend(bid, "post_players_id_blocklist_by_name", {
		path: { id: uid },
		body: { targetName },
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseBackendBlockUser(result) {
	if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("拉黑响应不完整");
	const row = result;
	if (typeof row.outcome !== "string" || ![
		"blocked",
		"locked",
		"target_not_found",
		"self",
		"target_missing",
		"full",
		"already_blocked",
		"failed"
	].includes(row.outcome) || row.name !== null && typeof row.name !== "string" || row.realmName !== null && typeof row.realmName !== "string") throw new Error("拉黑响应不完整");
	return row;
}

//#endregion
export { blockBackendUserByName, parseBackendBlockUser };