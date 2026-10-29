import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendCompanionInfo } from "../../../api/bot/companion-info-queries.js";
import { breakupBackendCompanion } from "../../../api/bot/companion-relationship-actions.js";
import { confirmBackendCompanionOverview } from "../../../api/bot/interaction-overview.js";
import "../../../api/index.js";

//#region src/response-apps/companion/breakup/app.ts
/** The confirmation page reads server facts; the server owns the breakup itself. */
async function checkBreakup(params) {
	const overview = params.confirmed ? await confirmBackendCompanionOverview(params.bid, params.uid, "breakup", params.request, params.messageText) : null;
	const info = overview ? overview.info : await getBackendCompanionInfo(params.bid, params.uid);
	const access = {
		ok: info.access.canUseFifthLayerFeature,
		realmName: info.access.realmName ?? "未知"
	};
	if (!info.companion) return {
		code: "NO_COMPANION",
		data: {
			message: "你当前没有道侣",
			access
		}
	};
	const settledResult = overview ? overview.mutationError ? {
		code: "FAIL",
		data: { message: overview.mutationError }
	} : {
		code: "OK",
		data: {
			message: overview.mutation?.message ?? "",
			narrativeText: overview.mutation?.narrativeText ?? ""
		}
	} : void 0;
	return {
		code: "CONFIRM_NEEDED",
		data: {
			partnerName: info.companion.partnerName ?? "未知道侣",
			access,
			settledResult
		}
	};
}
async function confirmBreakup(params) {
	try {
		const result = await breakupBackendCompanion(params.bid, params.uid, params.request);
		return {
			code: "OK",
			data: {
				message: result.message,
				narrativeText: result.narrativeText
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "解除道侣失败，请稍后再试" }
		};
	}
}

//#endregion
export { checkBreakup, confirmBreakup };