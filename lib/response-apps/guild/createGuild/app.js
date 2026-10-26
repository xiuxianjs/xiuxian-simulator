import { createBackendGuild } from "../../../api/bot/guild-membership-mutations.js";

//#region src/response-apps/guild/createGuild/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: {
				success: true,
				message: `宗门【${(await createBackendGuild(params.bid, params.uid, params.guildName, params.request, params.repeatCommand)).name}】创建成功，您已成为宗主`
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "创建宗门失败" }
		};
	}
}

//#endregion
export { App as default };