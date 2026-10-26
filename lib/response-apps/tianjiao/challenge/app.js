import { challengeBackendTianjiao } from "../../../api/bot/tianjiao-challenge.js";
import { presentTianjiaoChallenge } from "../../../api/bot/tianjiao-robot-query.js";

//#region src/response-apps/tianjiao/challenge/app.ts
async function App(params) {
	const match = params.messageText.match(/^(?:!|！|\/|#|＃)?(?:登天挑战|天骄挑战)\s+(\d+)$/);
	if (!match) return { code: "NO_MATCH" };
	const targetRank = Number(match[1]);
	if (!Number.isSafeInteger(targetRank)) return { code: "PARAM_ERROR" };
	try {
		const r = await challengeBackendTianjiao(params.bid, params.uid, targetRank, params.request);
		if (!r.success) return {
			code: "FAILED",
			message: r.message,
			uid: params.uid
		};
		return presentTianjiaoChallenge(r);
	} catch (e) {
		return {
			code: "FAILED",
			message: e instanceof Error ? e.message : "登天挑战失败",
			uid: params.uid
		};
	}
}

//#endregion
export { App as default };