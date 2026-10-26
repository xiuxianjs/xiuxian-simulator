import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-impeach.ts
async function impeachBackendGuildLeader(bid, uid, request, repeatCommand) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid < 1) throw new Error("弹劾参数无效");
	return parseGuildImpeach(await requestBackend(bid, "post_players_id_guild_leadership_impeach", {
		path: { id: uid },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildImpeach(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("弹劾响应不完整");
	const result = data;
	if (result.outcome !== "counted" && result.outcome !== "counted_no_successor" && result.outcome !== "leader_removed" || typeof result.message !== "string") throw new Error("弹劾响应不完整");
	return {
		outcome: result.outcome,
		message: result.message
	};
}

//#endregion
export { impeachBackendGuildLeader, parseGuildImpeach };