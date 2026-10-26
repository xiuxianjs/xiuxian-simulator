import { BackendAPIError } from "../../../api/bot/client.js";
import { claimBackendBounty, getBackendPendingBountyRewards } from "../../../api/bot/bounty-actions.js";

//#region src/response-apps/bounty/claim/app.ts
async function App(params) {
	if (params.bountyId === null) try {
		return {
			code: "LIST",
			data: { pending: await getBackendPendingBountyRewards(params.bid, params.uid) }
		};
	} catch {
		return { code: "FAIL" };
	}
	if (!Number.isSafeInteger(params.bountyId) || params.bountyId <= 0) return { code: "INVALID_ID" };
	try {
		return {
			code: "OK",
			data: await claimBackendBounty(params.bid, params.bountyId, params.request)
		};
	} catch (error) {
		if (error instanceof BackendAPIError) switch (error.code) {
			case "BOUNTY_INVALID_USER_STATUS": return { code: "INVALID_USER_STATUS" };
			case "BOUNTY_NOTHING_TO_CLAIM": return { code: "NOTHING_TO_CLAIM" };
			case "BOUNTY_INVALID_REWARD_AMOUNT": return { code: "INVALID_REWARD_AMOUNT" };
		}
		return { code: "FAIL" };
	}
}

//#endregion
export { App as default };