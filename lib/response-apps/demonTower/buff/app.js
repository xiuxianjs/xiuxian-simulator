import { selectBackendDemonTowerBuff } from "../../../api/bot/demon-tower-actions.js";

//#region src/response-apps/demonTower/buff/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await selectBackendDemonTowerBuff(params.bid, params.uid, params.buffKey, params.count, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "选择 Buff 失败" }
		};
	}
}

//#endregion
export { App as default };