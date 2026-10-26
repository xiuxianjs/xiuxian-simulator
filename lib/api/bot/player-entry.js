import { requestBackend } from "./client.js";

//#region src/api/bot/player-entry.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/**
* Send a registered player's platform message into the authoritative game
* entry workflow. Maintenance, fixed realm eligibility, comeback eligibility,
* resource settlement and their throttles all remain on the server.
*/
async function enterBackendPlayer(bid, uid, messageText, request) {
	const data = await requestBackend(bid, "post_players_id_entry", {
		path: { id: uid },
		body: { messageText },
		requestId: request?.requestId
	});
	if (!record(data) || !record(data.maintenance) || typeof data.maintenance.disabled !== "boolean") throw new Error("玩家入口响应不完整");
	if (typeof data.routeAllowed !== "boolean" || typeof data.nativeComebackProcessed !== "boolean" || typeof data.resourcesSettled !== "boolean") throw new Error("玩家入口处理状态格式无效");
	if (data.processingError !== void 0 && typeof data.processingError !== "string") throw new Error("玩家入口处理错误格式无效");
	if (data.featureGuard !== void 0 && (!record(data.featureGuard) || typeof data.featureGuard.blocked !== "boolean")) throw new Error("玩家入口功能资格格式无效");
	if (record(data.featureGuard) && (data.featureGuard.feature !== void 0 && typeof data.featureGuard.feature !== "string" || data.featureGuard.reason !== void 0 && typeof data.featureGuard.reason !== "string" || data.featureGuard.realmName !== void 0 && typeof data.featureGuard.realmName !== "string")) throw new Error("玩家入口功能资格格式无效");
	const { maintenance } = data;
	if (maintenance.reason !== void 0 && typeof maintenance.reason !== "string" || maintenance.endTime !== void 0 && typeof maintenance.endTime !== "string") throw new Error("玩家入口维护状态格式无效");
	return data;
}

//#endregion
export { enterBackendPlayer };