import { BackendAPIError } from "../../../api/bot/client.js";
import { acceptBackendBounty } from "../../../api/bot/bounty-actions.js";

//#region src/response-apps/bounty/accept/app.ts
/** 接赏：机器人只解析参数、调用 Go 并交给展示层反馈。 */
async function App(params) {
	if (!Number.isSafeInteger(params.bountyId) || params.bountyId <= 0) return { code: "INVALID_ID" };
	try {
		return {
			code: "OK",
			data: await acceptBackendBounty(params.bid, params.bountyId, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "接赏失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };