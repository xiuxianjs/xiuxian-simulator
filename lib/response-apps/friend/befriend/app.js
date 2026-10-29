import { requestFriendWorkflow } from "../../../api/bot/social-workflows.js";
import { isFriendRequestDomainFailure } from "../../../api/bot/friend-request-actions.js";

//#region src/response-apps/friend/befriend/app.ts
function parseBefriendCommand(messageText) {
	const match = (messageText?.trim() ?? "").match(/^[!！/#＃]?结交\s+(\d+)$/);
	if (!match) return null;
	const id = parseInt(match[1], 10);
	return isNaN(id) || id <= 0 ? -1 : id;
}
async function App(params) {
	try {
		const data = await requestFriendWorkflow(params.bid, params.uid, {
			action: "request",
			...params.selector
		}, params.request, params.repeatCommand);
		if (data.outcome === "locked") return {
			code: "LOCKED",
			data: { realmName: data.realmName ?? "未知" }
		};
		if (data.outcome !== "result" || !data.request) return { code: "INVALID" };
		const result = data.request;
		if (!result.success) return {
			code: "FAIL",
			data: { message: result.message }
		};
		return {
			code: "OK",
			data: {
				targetName: result.targetName,
				requestId: result.requestId
			}
		};
	} catch (error) {
		if (isFriendRequestDomainFailure(error)) return {
			code: "FAIL",
			data: { message: error.message }
		};
		throw error;
	}
}

//#endregion
export { App as default, parseBefriendCommand };