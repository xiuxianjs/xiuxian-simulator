import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend } from "./client.js";
import { parseBackendDungeonDetail } from "./queries.js";

//#region src/api/bot/query-presentation.ts
function requestBackendQueryPresentation(bid, uid, query, command, request, name) {
	return requestBackend(bid, "post_players_id_query_presentations", {
		path: { id: uid },
		body: {
			query,
			name
		},
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey,
		headers: repeatPresentationHeaders(request?.idempotencyKey ? command : void 0)
	});
}
async function getBackendDungeonDetailCommand(bid, uid, name, command, request) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendDungeonDetail(await requestBackendQueryPresentation(bid, uid, "dungeon_detail", command, request, name));
}

//#endregion
export { getBackendDungeonDetailCommand, requestBackendQueryPresentation };