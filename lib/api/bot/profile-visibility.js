import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/profile-visibility.ts
async function setBackendProfileVisibility(bid, uid, hideProfile, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "patch_players_id_preferences_profile_visibility", {
		path: { id: uid },
		body: { hideProfile },
		...context
	});
	if (!data || typeof data !== "object" || Array.isArray(data) || data.hideProfile !== hideProfile) throw new Error("信息隐藏配置响应不完整");
	return { hideProfile };
}

//#endregion
export { setBackendProfileVisibility };