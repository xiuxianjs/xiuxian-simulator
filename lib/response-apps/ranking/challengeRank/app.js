import { BackendAPIError } from "../../../api/bot/client.js";
import { challengeBackendTongtianTower } from "../../../api/bot/tongtian-tower.js";

//#region src/response-apps/ranking/challengeRank/app.ts
async function App(params) {
	const match = (params.messageText || "").match(/^(?:!|！|\/|#|＃)?挑战排名\s+(\d+)\s*$/);
	if (!match) return /^\s*(?:!|！|\/|#|＃)?挑战排名/.test(params.messageText || "") ? { code: "PARAM_ERROR" } : { code: "NO_MATCH" };
	try {
		return {
			code: "SUCCESS",
			data: await challengeBackendTongtianTower(params.bid, params.uid, Number(match[1]), params.request)
		};
	} catch (error) {
		const message = error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : "挑战排名失败，请稍后再试";
		return {
			code: "FAILED",
			uid: params.uid,
			message,
			needPotion: error instanceof BackendAPIError && error.code === "TONGTIAN_INSUFFICIENT_QI"
		};
	}
}

//#endregion
export { App as default };