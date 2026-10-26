import { getBackendTowerFirstRewards } from "../../../api/bot/tower-rewards-queries.js";
import { presentTowerFirstRewards } from "../../../api/bot/ranking-robot-query.js";

//#region src/response-apps/ranking/viewFirstRewards/app.ts
async function App(params) {
	const data = await getBackendTowerFirstRewards(params.bid, params.uid);
	return presentTowerFirstRewards(data);
}

//#endregion
export { App as default };