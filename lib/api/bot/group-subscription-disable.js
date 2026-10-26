import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/group-subscription-disable.ts
async function disableBackendGroupSubscription(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "delete_players_id_notification_subscription", {
		path: { id: uid },
		...context
	});
	if (!data || typeof data !== "object" || !("disabled" in data) || typeof data.disabled !== "boolean") throw new Error("群订阅关闭响应不完整");
	return data.disabled;
}

//#endregion
export { disableBackendGroupSubscription };