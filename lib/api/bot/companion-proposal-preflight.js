import { requestBackend } from "./client.js";

//#region src/api/bot/companion-proposal-preflight.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣申请预检数据不完整");
	return value;
}
function positiveInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function nonNegativeInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function parseTarget(value) {
	if (value === null) return null;
	const target = record(value);
	if (!positiveInteger(target.id) || typeof target.name !== "string") throw new Error("道侣申请预检数据不完整");
	return {
		id: target.id,
		name: target.name
	};
}
function parseOathItem(value) {
	const item = record(value);
	if (!positiveInteger(item.itemId) || typeof item.name !== "string" || !nonNegativeInteger(item.quantity) || typeof item.oathType !== "string" || typeof item.desc !== "string") throw new Error("道侣申请预检数据不完整");
	return {
		itemId: item.itemId,
		name: item.name,
		quantity: item.quantity,
		oathType: item.oathType,
		desc: item.desc
	};
}
function parseFriend(value) {
	const friend = record(value);
	if (!positiveInteger(friend.friendId) || typeof friend.friendName !== "string" || typeof friend.friendRealm !== "string" || typeof friend.spiritBondLevel !== "string" || typeof friend.intimacy !== "number" || !Number.isFinite(friend.intimacy)) throw new Error("道侣申请预检数据不完整");
	return {
		friendId: friend.friendId,
		friendName: friend.friendName,
		friendRealm: friend.friendRealm,
		intimacy: friend.intimacy,
		spiritBondLevel: friend.spiritBondLevel
	};
}
async function getBackendCompanionProposalPreflight(bid, uid, target, page) {
	if (!bid) throw new Error("道侣申请缺少平台身份");
	return parseCompanionProposalPreflight(record(await requestBackend(bid, "get_players_id_companion_proposal_preflight", {
		path: { id: uid },
		query: {
			target,
			page,
			pageSize: 10
		}
	})));
}
function parseCompanionProposalPreflight(value) {
	const data = record(value);
	if (typeof data.initiatorName !== "string" || !Array.isArray(data.oathItems) || !Array.isArray(data.friends) || !nonNegativeInteger(data.currentPage) || !nonNegativeInteger(data.totalPages) || !nonNegativeInteger(data.totalCount)) throw new Error("道侣申请预检数据不完整");
	return {
		initiatorName: data.initiatorName,
		target: parseTarget(data.target),
		oathItems: data.oathItems.map(parseOathItem),
		friends: data.friends.map(parseFriend),
		currentPage: data.currentPage,
		totalPages: data.totalPages,
		totalCount: data.totalCount
	};
}

//#endregion
export { getBackendCompanionProposalPreflight, parseCompanionProposalPreflight };