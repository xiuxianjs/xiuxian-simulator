import { postBackendGuildUpgrade } from "../../../api/bot/guild-upgrade.js";

//#region src/response-apps/guild/upgradeShop/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await postBackendGuildUpgrade(params.bid, params.uid, "shop", params.request, params.repeatCommand)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "商店升级失败" }
		};
	}
}

//#endregion
export { App as default };