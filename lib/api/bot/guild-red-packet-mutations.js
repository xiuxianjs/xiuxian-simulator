import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-red-packet-mutations.ts
function record(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
function currency(value) {
	return value === "spirit_stone" || value === "spirits_crystal" || value === "contribution";
}
function parseGuildRedPacketSend(value) {
	const data = record(value, "发红包响应不完整");
	if (!integer(data.packetId) || !currency(data.currencyType) || ![
		5,
		10,
		15,
		20,
		25,
		30
	].includes(data.packetCount) || ![
		100,
		1e3,
		1e4,
		1e5
	].includes(data.perAmount) || !integer(data.autoClaimedAmount) || typeof data.message !== "string") throw new Error("发红包响应不完整");
	return data;
}
function parseGuildRedPacketSettlement(value, action) {
	const data = record(value, `${action}红包响应不完整`);
	if (!integer(data.packetId) || !currency(data.currencyType) || typeof data.message !== "string") throw new Error(`${action}红包响应不完整`);
	if (action === "领取") {
		if (!integer(data.amount)) throw new Error("领取红包响应不完整");
		return data;
	}
	if (!integer(data.refundAmount)) throw new Error("回收红包响应不完整");
	return data;
}
async function sendBackendGuildRedPacket(bid, uid, input, request) {
	if (!bid) throw new Error("发红包缺少平台身份");
	return parseGuildRedPacketSend(await requestBackend(bid, "post_players_id_guild_red_packets", {
		path: { id: uid },
		body: input,
		...writeContext(request)
	}));
}
async function claimBackendGuildRedPacket(bid, uid, packetId, request) {
	if (!bid) throw new Error("领取红包缺少平台身份");
	return parseGuildRedPacketSettlement(await requestBackend(bid, "post_players_id_guild_red_packets_packetId_claim", {
		path: {
			id: uid,
			packetId
		},
		...writeContext(request)
	}), "领取");
}
async function recycleBackendGuildRedPacket(bid, uid, packetId, request) {
	if (!bid) throw new Error("回收红包缺少平台身份");
	return parseGuildRedPacketSettlement(await requestBackend(bid, "post_players_id_guild_red_packets_packetId_recycle", {
		path: {
			id: uid,
			packetId
		},
		...writeContext(request)
	}), "回收");
}

//#endregion
export { claimBackendGuildRedPacket, parseGuildRedPacketSend, parseGuildRedPacketSettlement, recycleBackendGuildRedPacket, sendBackendGuildRedPacket };