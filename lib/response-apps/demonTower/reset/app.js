import { resetBackendDemonTower } from "../../../api/bot/demon-tower-actions.js";

//#region src/response-apps/demonTower/reset/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await resetBackendDemonTower(params.bid, params.uid, params.request, params.messageText)).message }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "妖塔重置失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };