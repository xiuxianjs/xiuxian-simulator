import { impeachBackendGuildLeader } from "../../../api/bot/guild-impeach.js";

//#region src/response-apps/guild/impeachLeader/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await impeachBackendGuildLeader(params.bid, params.uid, params.request, params.repeatCommand)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "弹劾失败" }
		};
	}
}

//#endregion
export { App as default };