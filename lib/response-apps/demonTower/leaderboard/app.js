import { getBackendTowerRanking } from "../../../api/bot/tower-ranking-queries.js";

//#region src/response-apps/demonTower/leaderboard/app.ts
async function App(params) {
	const result = await getBackendTowerRanking(params.bid, params.uid, params.page);
	if (!result.access.ok || !result.leaderboard) return {
		code: "LOCKED",
		data: { realmName: result.access.realmName ?? "未知" }
	};
	return {
		code: "OK",
		data: {
			...result.leaderboard,
			nearby: result.leaderboard.nearby.map((row) => ({
				...row,
				uid: row.playerId
			})),
			list: result.leaderboard.list.map((row) => ({
				...row,
				uid: row.playerId
			}))
		}
	};
}

//#endregion
export { App as default };