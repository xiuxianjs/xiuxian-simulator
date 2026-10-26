import { challengeBackendDemonTower } from "../../../api/bot/demon-tower-actions.js";

//#region src/response-apps/demonTower/challenge/app.ts
async function App(params) {
	if (!Number.isInteger(params.star) || ![
		1,
		2,
		3
	].includes(params.star)) return {
		code: "INVALID_STAR",
		data: { message: "星级只能是 1、2 或 3" }
	};
	try {
		return {
			code: "OK",
			data: await challengeBackendDemonTower(params.bid, params.uid, params.star, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "妖塔挑战失败" }
		};
	}
}

//#endregion
export { App as default };