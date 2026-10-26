import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/newcomer-recharge-claim.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("新人返利领取响应不完整");
	return value;
}
function parseBackendNewcomerRechargeClaim(value) {
	const row = record(value);
	const reward = record(row.reward);
	if (!Number.isSafeInteger(row.dayIndex) || Number(row.dayIndex) < 1 || Number(row.dayIndex) > 14 || !Number.isSafeInteger(reward.spiritStone) || !Number.isSafeInteger(reward.spiritCrystal) || !Number.isSafeInteger(reward.spiritMilk) || typeof reward.itemIds !== "string" || typeof row.rewardText !== "string" || !row.itemNames || typeof row.itemNames !== "object" || Array.isArray(row.itemNames) || !Object.values(row.itemNames).every((name) => typeof name === "string")) throw new Error("新人返利领取响应不完整");
	return {
		dayIndex: row.dayIndex,
		reward: {
			spiritStone: reward.spiritStone,
			spiritCrystal: reward.spiritCrystal,
			spiritMilk: reward.spiritMilk,
			itemIds: reward.itemIds
		},
		itemNames: row.itemNames,
		rewardText: row.rewardText
	};
}
async function claimBackendNewcomerRechargeDay(bid, uid, dayIndex, request, repeatCommand) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(dayIndex) || dayIndex < 1 || dayIndex > 14) throw new Error("新人返利领取参数无效");
	return parseBackendNewcomerRechargeClaim(await requestBackend(bid, "post_players_id_recharge_newcomer_claim", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body: { dayIndex },
		...writeContext(request)
	}));
}

//#endregion
export { claimBackendNewcomerRechargeDay, parseBackendNewcomerRechargeClaim };