import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/theme-ink-mode.ts
async function switchBackendInkMode(bid, uid, mode, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return validateBackendInkMode(await requestBackend(bid, "post_players_id_themes_ink_mode", {
		path: { id: uid },
		body: { mode },
		...context
	}), mode);
}
function validateBackendInkMode(data, mode) {
	if (!data || typeof data !== "object" || Array.isArray(data) || !("code" in data) || typeof data.code !== "string" || data.code !== "OK" && data.code !== "NO_ACTIVE_THEME" || !("mode" in data) || data.mode !== mode) throw new Error("墨色模式响应不完整");
	return {
		code: data.code,
		mode
	};
}

//#endregion
export { switchBackendInkMode, validateBackendInkMode };