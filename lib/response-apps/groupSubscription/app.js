import { enableBackendGroupSubscription } from "../../api/bot/group-subscription-enable.js";

//#region src/response-apps/groupSubscription/app.ts
async function enableSubscription(bid, userId, platform, channelId, botId, targetScope, request) {
	return await enableBackendGroupSubscription(bid, userId, {
		platform,
		channelId,
		botId,
		targetScope
	}, request);
}

//#endregion
export { enableSubscription };