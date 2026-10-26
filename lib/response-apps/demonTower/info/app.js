import { getBackendDemonTowerInfo } from "../../../api/bot/demon-tower-info-query.js";

//#region src/response-apps/demonTower/info/app.ts
function App(params) {
	return getBackendDemonTowerInfo(params.bid, params.uid);
}

//#endregion
export { App as default };