import { getBackendGuildBattleTraining, postBackendGuildBattleTraining } from "../../../api/bot/guild-battle-training.js";

//#region src/response-apps/guild/battleTraining/app.ts
async function App(params) {
	try {
		if (!params.branch || !params.key) return {
			code: "GUIDE",
			data: await getBackendGuildBattleTraining(params.bid, params.uid)
		};
		return {
			code: "OK",
			data: await postBackendGuildBattleTraining(params.bid, params.uid, params.branch, params.key, params.request)
		};
	} catch (error) {
		const message = error?.message ?? "宗门战备操作失败";
		return {
			code: /尚未加入宗门|还没有加入宗门/.test(message) ? "NO_GUILD" : "FAILED",
			data: { message }
		};
	}
}

//#endregion
export { App as default };