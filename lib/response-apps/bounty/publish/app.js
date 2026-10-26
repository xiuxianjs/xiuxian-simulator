import { BackendAPIError } from "../../../api/bot/client.js";
import { publishBackendBounty } from "../../../api/bot/bounty-actions.js";

//#region src/response-apps/bounty/publish/app.ts
async function App(params) {
	const { bid, uid, targetUid, amount, maxCompletions, request } = params;
	if (!Number.isSafeInteger(targetUid) || !Number.isSafeInteger(amount) || maxCompletions !== void 0 && !Number.isSafeInteger(maxCompletions)) return { code: "INVALID_PARAMS" };
	try {
		return {
			code: "OK",
			data: await publishBackendBounty(bid, uid, targetUid, amount, maxCompletions, request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "悬赏发布失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };