import { postBackendGuildStipendClaim } from "../../../api/bot/guild-worship-stipend.js";

//#region src/response-apps/guild/stipend/app.ts
async function App(params) {
	try {
		const result = await postBackendGuildStipendClaim(params.bid, params.uid, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: { message: `你领取了本周俸禄【${result.amount}】灵石。（基础${result.baseAmount} × 宗门${result.guildLevel}级${result.levelMultiplier.toFixed(1)}倍 × 活跃${result.activityMultiplier.toFixed(1)}倍）` }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "领取俸禄失败" }
		};
	}
}

//#endregion
export { App as default };