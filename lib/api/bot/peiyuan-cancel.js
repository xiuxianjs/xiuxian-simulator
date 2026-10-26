import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/peiyuan-cancel.ts
async function cancelBackendPeiyuan(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendPeiyuanCancel(await requestBackend(bid, "post_players_id_peiyuan_dan_cancel", {
		path: { id: uid },
		headers: repeatPresentationHeaders("取消培元丹"),
		...context
	}));
}
function parseBackendPeiyuanCancel(value) {
	const data = value;
	if (data?.outcome === "cancelled" && typeof data.pendingJson === "string" && typeof data.message === "string" && data.message.trim()) return data;
	if (data?.outcome === "not_pending" && data.pendingJson === null && typeof data.message === "string" && data.message.trim()) return data;
	throw new Error("培元丹取消响应不完整");
}

//#endregion
export { cancelBackendPeiyuan, parseBackendPeiyuanCancel };