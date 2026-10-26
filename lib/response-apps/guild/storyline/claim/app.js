import { requestGuildWorkflow } from "../../../../api/bot/guild-workflow.js";

//#region src/response-apps/guild/storyline/claim/app.ts
async function App(params) {
	try {
		const data = await requestGuildWorkflow(params.bid, params.uid, {
			action: "storyline_claim",
			...params.stageIndex ? { stageIndex: params.stageIndex } : {}
		}, params.request);
		return {
			code: "OK",
			data: {
				message: `奖励领取成功，获得灵晶${data.spiritCrystal}`,
				stageIndex: data.stageIndex,
				spiritCrystal: data.spiritCrystal
			}
		};
	} catch (error) {
		return {
			code: "FAILED",
			data: { message: error instanceof Error ? error.message : "领取宗门主线奖励失败" }
		};
	}
}

//#endregion
export { App as default };