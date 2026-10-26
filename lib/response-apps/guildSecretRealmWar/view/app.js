import { getBackendSecretRealm } from "../../../api/bot/guild-secret-realm-war.js";

//#region src/response-apps/guildSecretRealmWar/view/app.ts
async function App(params) {
	if (!params.realmNo) return { code: "NEED_REALM_NO" };
	try {
		return {
			code: "OK",
			data: await getBackendSecretRealm(params.bid, params.realmNo, params.page)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "查看秘境失败" }
		};
	}
}

//#endregion
export { App as default };