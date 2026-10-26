import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-application-cancel.ts
async function cancelBackendGuildApplication(bid, uid, applicationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseGuildApplicationCancel(await requestBackend(bid, "delete_players_id_guild_applications_applicationId", {
		path: {
			id: uid,
			applicationId
		},
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildApplicationCancel(data) {
	if (!data || typeof data !== "object" || !("outcome" in data) || typeof data.outcome !== "string" || !["cancelled", "not_pending"].includes(data.outcome) || !("guildExists" in data) || typeof data.guildExists !== "boolean" || !("guildName" in data) || data.guildName !== null && typeof data.guildName !== "string") throw new Error("取消宗门申请响应不完整");
	return data;
}

//#endregion
export { cancelBackendGuildApplication, parseGuildApplicationCancel };