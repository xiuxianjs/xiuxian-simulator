import { getBackendTianjiaoLeaderboard } from "../../../api/bot/tianjiao-leaderboard-queries.js";
import { presentTianjiaoLeaderboard } from "../../../api/bot/tianjiao-robot-query.js";

//#region src/response-apps/tianjiao/leaderboard/app.ts
async function App(params) {
	if (!/^(!|！|\/|#|＃)?(查看)?(登天梯|天骄榜)$/.test(params.messageText || "")) return { code: "NO_MATCH" };
	const access = await getBackendTianjiaoLeaderboard(params.bid, params.uid);
	return presentTianjiaoLeaderboard(access);
}

//#endregion
export { App as default };