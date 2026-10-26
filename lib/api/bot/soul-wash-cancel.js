import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/soul-wash-cancel.ts
async function cancelBackendSoulWash(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseSoulWashCancel(await requestBackend(bid, "post_players_id_soul_artifacts_wash_cancel", {
		path: { id: uid },
		...context
	}));
}
function parseSoulWashCancel(value) {
	const data = value;
	if (!data || ![
		"cancelled",
		"no_pending",
		"busy",
		"conflict"
	].includes(data.status) || !Number.isSafeInteger(data.totalSuccess) || data.totalSuccess < 0) throw new Error("本命物洗涤取消接口数据不完整");
	return data;
}

//#endregion
export { cancelBackendSoulWash, parseSoulWashCancel };