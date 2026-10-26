import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/player-profile-action.ts
async function executeBackendPlayerProfileAction(bid, uid, action, value, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return validateBackendPlayerProfileAction(await requestBackend(bid, "post_players_id_profile_actions", {
		headers: repeatPresentationHeaders(action === "rename" ? "改名" : action === "gender" ? "改性" : "改签名"),
		path: { id: uid },
		body: {
			action,
			value
		},
		...context
	}), action);
}
function validateBackendPlayerProfileAction(data, action) {
	if (!data || typeof data !== "object" || Array.isArray(data) || !("action" in data) || data.action !== action || !("value" in data) || typeof data.value !== "string" || !("cleared" in data) || typeof data.cleared !== "boolean") throw new Error("角色资料动作响应不完整");
	return {
		action,
		value: data.value,
		cleared: data.cleared
	};
}

//#endregion
export { executeBackendPlayerProfileAction, validateBackendPlayerProfileAction };