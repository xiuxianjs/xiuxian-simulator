import { getBackendSecretRealms } from "../../../api/bot/guild-secret-realm-war.js";

//#region src/response-apps/guildSecretRealmWar/list/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendSecretRealms(params.bid, params.page)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取秘境列表失败" }
		};
	}
}

//#endregion
export { App as default };