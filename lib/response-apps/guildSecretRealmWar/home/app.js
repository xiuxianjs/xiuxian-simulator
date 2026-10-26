import { getBackendSecretRealmHome } from "../../../api/bot/guild-secret-realm-war.js";

//#region src/response-apps/guildSecretRealmWar/home/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendSecretRealmHome(params.bid, params.uid)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取灵脉攻防战信息失败" }
		};
	}
}

//#endregion
export { App as default };