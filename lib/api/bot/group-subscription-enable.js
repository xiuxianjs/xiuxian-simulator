import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/group-subscription-enable.ts
async function enableBackendGroupSubscription(bid, uid, target, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "put_players_id_notification_subscription", {
		path: { id: uid },
		body: {
			platform: target.platform,
			channelId: target.channelId,
			botId: target.botId ?? null,
			targetScope: target.targetScope
		},
		...context
	});
	if (!data || typeof data !== "object" || !("switched" in data) || typeof data.switched !== "boolean") throw new Error("群订阅开启响应不完整");
	return data;
}

//#endregion
export { enableBackendGroupSubscription };