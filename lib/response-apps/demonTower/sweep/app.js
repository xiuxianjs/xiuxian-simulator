import { sweepBackendDemonTower } from "../../../api/bot/demon-tower-actions.js";

//#region src/response-apps/demonTower/sweep/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await sweepBackendDemonTower(params.bid, params.uid, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "妖塔扫荡失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };