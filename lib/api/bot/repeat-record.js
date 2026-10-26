import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/repeat-record.ts
async function updateBackendRepeatRecord(bid, uid, command, message, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "post_players_id_client_state_repeat_record", {
		path: { id: uid },
		body: {
			command,
			message
		},
		...context
	});
	if (!data || !Number.isFinite(data.count) || typeof data.suffix !== "string") throw new Error("重复记录响应不完整");
	return data;
}

//#endregion
export { updateBackendRepeatRecord };