import { challengeBackendWorldBoss } from "../../../api/bot/world-boss-challenge.js";
import { worldBossChallengeView } from "../../../response/worldBoss/challenge/view.js";

//#region src/response-apps/worldBoss/challenge/app.ts
/** The robot invokes Go once; Go owns both the single and all-attempts settlements. */
async function App(params) {
	try {
		const useAllAttempts = Boolean(params.useAllAttempts);
		const result = await challengeBackendWorldBoss(params.bid, params.uid, useAllAttempts, params.request);
		return {
			code: "OK",
			data: worldBossChallengeView(result, useAllAttempts)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "挑战凶兽失败" }
		};
	}
}

//#endregion
export { App as default };