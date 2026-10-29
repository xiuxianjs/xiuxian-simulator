import { BackendAPIError } from "../../../api/bot/client.js";
import { actBackendCompanionProposalByName } from "../../../api/bot/interaction-overview.js";
import "../../../api/index.js";

//#region src/response-apps/companion/reject/app.ts
async function App(params) {
	try {
		const result = await actBackendCompanionProposalByName(params.bid, params.uid, params.proposerName, "reject", params.request, params.messageText);
		return {
			code: result.success ? "OK" : "FAIL",
			data: { message: result.message }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "拒绝道侣申请失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };