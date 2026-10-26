import { BackendAPIError } from "../../../api/bot/client.js";
import "../../../api/index.js";
import { getBackendCompanionProposals } from "../../../api/bot/companion-proposal-queries.js";
import { actBackendCompanionProposalByName } from "../../../api/bot/interaction-overview.js";

//#region src/response-apps/companion/accept/app.ts
async function App(params) {
	if (!params.proposerName) return {
		code: "LIST",
		data: { received: (await getBackendCompanionProposals(params.bid, params.uid)).map((p) => ({
			fromName: p.fromName,
			intimacy: p.intimacy
		})) }
	};
	try {
		const result = await actBackendCompanionProposalByName(params.bid, params.uid, params.proposerName, "accept", params.request, params.messageText);
		return {
			code: result.success ? "OK" : "FAIL",
			data: { message: result.message }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "同意道侣申请失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };