import { requestBackend, writeContext } from "../../../api/bot/client.js";

//#region src/response-apps/comeback/oldGameCode/app.ts
async function App(params) {
	try {
		const result = await requestBackend(params.bid, "post_players_id_old_game_comeback_code_issue", {
			path: { id: params.uid },
			body: { platformUserId: params.bid },
			...writeContext(params.request)
		});
		if (!result || typeof result !== "object" || Array.isArray(result) || typeof result.giftCode !== "string") throw new Error("凡人修仙礼包码响应不完整");
		return {
			code: "OK",
			data: { giftCode: result.giftCode }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "当前无法获取凡人修仙礼包码，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };