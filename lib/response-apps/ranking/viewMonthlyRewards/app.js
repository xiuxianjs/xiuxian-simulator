import { getBackendTowerMonthlyRewards } from "../../../api/bot/tower-rewards-queries.js";
import { presentTowerMonthlyRewards } from "../../../api/bot/ranking-robot-query.js";

//#region src/response-apps/ranking/viewMonthlyRewards/app.ts
async function App(params) {
	const data = await getBackendTowerMonthlyRewards(params.bid, params.uid);
	return presentTowerMonthlyRewards(data);
}

//#endregion
export { App as default };