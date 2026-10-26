import { requestBackend, writeContext } from "./client.js";
import { parseBackendRealmPromotion } from "./realm-promotion.js";

//#region src/api/bot/promotion-command.ts
async function executeBackendPromotionCommand(bid, uid, request) {
	if (!bid) throw new Error("晋级操作参数无效");
	return parsePromotionCommand(await requestBackend(bid, "post_players_id_realm_promotion_command", {
		path: { id: uid },
		body: {},
		...writeContext(request)
	}));
}
function parsePromotionCommand(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("晋级聚合响应不完整");
	const value = data;
	if (value.mode === "preparation") {
		if (!value.overview || typeof value.overview !== "object" || !value.overview.tribulationPreparation) throw new Error("晋级渡劫准备响应不完整");
		return {
			mode: "preparation",
			overview: value.overview
		};
	}
	if (value.mode !== "promotion") throw new Error("晋级聚合响应状态无效");
	const overview = value.overview && typeof value.overview === "object" ? value.overview : null;
	return {
		mode: "promotion",
		result: parseBackendRealmPromotion(value.result),
		overview
	};
}

//#endregion
export { executeBackendPromotionCommand, parsePromotionCommand };