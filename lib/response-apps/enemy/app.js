import { getBackendEnemies } from "../../api/bot/queries.js";
import "../../api/bot/index.js";

//#region src/response-apps/enemy/app.ts
async function App(params) {
	const enemies = await getBackendEnemies(params.bid, params.uid);
	if (enemies.length === 0) return {
		code: "EMPTY",
		data: {}
	};
	return {
		code: "OK",
		data: { enemies }
	};
}

//#endregion
export { App as default };