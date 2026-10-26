import { postBackendGuildUpgrade } from "../../../api/bot/guild-upgrade.js";

//#region src/response-apps/guild/upgradeVein/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await postBackendGuildUpgrade(params.bid, params.uid, "vein", params.request, params.repeatCommand)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "灵脉升级失败" }
		};
	}
}

//#endregion
export { App as default };