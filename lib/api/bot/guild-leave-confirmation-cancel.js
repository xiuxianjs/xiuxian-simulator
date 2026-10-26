import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-leave-confirmation-cancel.ts
async function cancelBackendGuildLeaveConfirmation(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseGuildLeaveCancel(await requestBackend(bid, "delete_players_id_guild_leave_confirmation", {
		path: { id: uid },
		...context
	}));
}
function parseGuildLeaveCancel(value) {
	const data = value;
	if (!data || typeof data.deleted !== "boolean") throw new Error("宗门确认状态取消响应不完整");
	return data;
}

//#endregion
export { cancelBackendGuildLeaveConfirmation, parseGuildLeaveCancel };