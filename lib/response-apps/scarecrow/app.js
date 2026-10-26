import { challengeBackendScarecrow } from "../../api/bot/scarecrow.js";

//#region src/response-apps/scarecrow/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await challengeBackendScarecrow(params.bid, params.uid, params.roundsText, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "稻草人测试失败" }
		};
	}
}

//#endregion
export { App as default };