import { BackendAPIError } from "../../../api/bot/client.js";
import { MSG_COMMON } from "../../../constants/messages.js";
import { acceptBackendFriendRequest, isFriendRequestDomainFailure } from "../../../api/bot/friend-request-actions.js";

//#region src/response-apps/friend/acceptBefriend/app.ts
function parseAcceptCommand(messageText) {
	const match = (messageText?.trim() ?? "").match(/^[!！/#＃]?同意结交\s+(\d+)$/);
	if (!match) return null;
	const id = parseInt(match[1], 10);
	return isNaN(id) ? null : id;
}
async function App(params) {
	try {
		const result = await acceptBackendFriendRequest(params.bid, params.uid, params.requestId, params.request, params.repeatCommand);
		if (!result.success) return {
			code: "FAIL",
			data: { message: result.message }
		};
		return {
			code: "OK",
			data: { fromUserName: result.fromUserName }
		};
	} catch (error) {
		if (isFriendRequestDomainFailure(error)) return {
			code: "FAIL",
			data: { message: error.message }
		};
		if (error instanceof BackendAPIError) return {
			code: "FAIL",
			data: { message: MSG_COMMON.OPERATION_FAILED }
		};
		throw error;
	}
}

//#endregion
export { App as default, parseAcceptCommand };