import { requestBackend } from "./client.js";

//#region src/api/bot/referral-invitees.ts
const integer = (value, minimum = 0) => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
function nextReward(value) {
	if (value === null) return true;
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const row = value;
	return typeof row.goal === "string" && Array.isArray(row.rewards) && row.rewards.every((reward) => typeof reward === "string");
}
async function getReferralInvitees(bid, uid, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseReferralInvitees(await requestBackend(bid, "get_players_id_referral_invitees", {
		path: { id: uid },
		query: {
			page,
			pageSize: 5
		}
	}), page);
}
function parseReferralInvitees(value, page) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("邀请列表响应不完整");
	const data = value;
	if (!integer(data.total) || !integer(data.page, 1) || data.page !== page || data.pageSize !== 5 || !Array.isArray(data.items) || data.items.length > 5 || data.items.length > data.total) throw new Error("邀请列表分页响应不完整");
	for (const item of data.items) {
		if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("邀请道友响应不完整");
		const row = item;
		if (!integer(row.userId, 1) || typeof row.name !== "string" || typeof row.realmName !== "string" || !integer(row.pendingRewards) || !integer(row.claimedRewards) || !nextReward(row.nextRealmReward) || !nextReward(row.nextVipReward)) throw new Error("邀请道友响应不完整");
	}
	return data;
}

//#endregion
export { getReferralInvitees, parseReferralInvitees };