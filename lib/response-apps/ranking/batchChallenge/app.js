import { BackendAPIError } from "../../../api/bot/client.js";
import { batchChallengeBackendTongtianTower } from "../../../api/bot/tongtian-tower.js";

//#region src/response-apps/ranking/batchChallenge/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await batchChallengeBackendTongtianTower(params.bid, params.uid, params.request)
		};
	} catch (error) {
		return {
			code: "FAILED",
			uid: params.uid,
			message: error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : "连续爬塔失败，请稍后再试"
		};
	}
}

//#endregion
export { App as default };