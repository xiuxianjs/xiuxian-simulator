import { getBackendTianjiaoRewards } from "../../../api/bot/tianjiao-rewards-queries.js";
import { presentTianjiaoRewards } from "../../../api/bot/tianjiao-robot-query.js";

//#region src/response-apps/tianjiao/rewards/app.ts
async function App(params) {
	if (!/^(!|！|\/|#|＃)?(登天奖励|天骄奖励)(记录)?$/.test(params.messageText || "")) return { code: "NO_MATCH" };
	const data = await getBackendTianjiaoRewards(params.bid, params.uid);
	return presentTianjiaoRewards(data);
}

//#endregion
export { App as default };