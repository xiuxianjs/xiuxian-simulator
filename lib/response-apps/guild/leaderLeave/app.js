import { leaderLeaveBackendGuild } from "../../../api/bot/guild-member-lifecycle.js";

//#region src/response-apps/guild/leaderLeave/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await leaderLeaveBackendGuild(params.bid, params.uid, params.request, params.repeatCommand)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "请假失败" }
		};
	}
}

//#endregion
export { App as default };