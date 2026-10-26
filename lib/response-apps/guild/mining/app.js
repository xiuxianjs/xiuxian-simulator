import { postBackendGuildMining } from "../../../api/bot/guild-mining.js";

//#region src/response-apps/guild/mining/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await postBackendGuildMining(params.bid, params.uid, params.request, params.repeatCommand)).message }
		};
	} catch (error) {
		if (error?.status === 409 || error?.code === "CONFLICT") return {
			code: "FAIL",
			data: { message: error?.message ?? "采矿失败" }
		};
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "挖矿失败" }
		};
	}
}

//#endregion
export { App as default };