import { getBackendCompanionProposalPreflight } from "../../../api/bot/companion-proposal-preflight.js";
import { executeBackendCompanionProposalCommand, proposeBackendCompanionOverview } from "../../../api/bot/interaction-overview.js";

//#region src/response-apps/companion/propose/app.ts
async function findTargetUser(bid, uid, arg) {
	const result = await getBackendCompanionProposalPreflight(bid, uid, arg, 1);
	return result.target ? {
		code: "FOUND",
		data: result.target,
		preflight: result
	} : {
		code: "NOT_FOUND",
		data: { name: arg }
	};
}
async function getEligibleFriends(params) {
	const result = await getBackendCompanionProposalPreflight(params.bid, params.uid, void 0, params.page);
	return {
		code: "OK",
		data: {
			friends: result.friends,
			currentPage: result.currentPage,
			totalPages: result.totalPages,
			totalCount: result.totalCount
		}
	};
}
async function getOathItemsForPropose(params) {
	const result = params.preflight ?? await getBackendCompanionProposalPreflight(params.bid, params.uid, void 0, 1);
	return result.oathItems.length > 0 ? {
		code: "OK",
		data: {
			items: result.oathItems,
			initiatorName: result.initiatorName
		}
	} : { code: "NO_OATH_ITEMS" };
}
async function performPropose(params) {
	try {
		const mutation = await proposeBackendCompanionOverview(params.bid, params.uid, params.targetId, params.itemId, params.request);
		if (!mutation.success) return {
			code: "FAIL",
			data: { message: mutation.message }
		};
		return {
			code: "OK",
			data: {
				message: mutation.message,
				initiatorName: mutation.initiatorName
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "发起道侣申请失败，请稍后再试" }
		};
	}
}
const executeProposalCommand = (params) => executeBackendCompanionProposalCommand(params.bid, params.uid, {
	target: params.target,
	targetBid: params.targetBid,
	oathIndex: params.oathIndex,
	fallbackPage: params.fallbackPage
}, params.request);

//#endregion
export { executeProposalCommand, findTargetUser, getEligibleFriends, getOathItemsForPropose, performPropose };