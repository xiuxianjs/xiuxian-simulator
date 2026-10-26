import { requestBackend } from "./client.js";

//#region src/api/bot/companion-proposal-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣申请列表响应不完整");
	return value;
}
function positiveInteger(value) {
	if (!Number.isSafeInteger(value) || value < 1) throw new Error("道侣申请列表响应不完整");
	return value;
}
function finiteInteger(value) {
	if (!Number.isSafeInteger(value)) throw new Error("道侣申请列表响应不完整");
	return value;
}
function dateTime(value) {
	if (typeof value !== "string" || value.length === 0 || Number.isNaN(Date.parse(value))) throw new Error("道侣申请列表响应不完整");
	return value;
}
async function getBackendCompanionProposals(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompanionProposalInbox(await requestBackend(bid, "get_players_id_companion_proposals", { path: { id: uid } }));
}
function parseCompanionProposalInbox(value) {
	const data = record(value);
	if (!Array.isArray(data.received) || data.received.length > 50) throw new Error("道侣申请列表响应不完整");
	return data.received.map((value) => {
		const item = record(value);
		if (typeof item.fromName !== "string" || item.fromName.length === 0) throw new Error("道侣申请列表响应不完整");
		return {
			proposalId: positiveInteger(item.proposalId),
			proposerId: positiveInteger(item.proposerId),
			fromName: item.fromName,
			intimacy: finiteInteger(item.intimacy),
			createdAt: dateTime(item.createdAt)
		};
	});
}

//#endregion
export { getBackendCompanionProposals, parseCompanionProposalInbox };