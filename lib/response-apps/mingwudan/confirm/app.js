import { repeatPresentationHeaders } from "../../../api/bot/repeat-presentation.js";
import { requestBackend, writeContext } from "../../../api/bot/client.js";

//#region src/response-apps/mingwudan/confirm/app.ts
async function App(params) {
	const { bid, uid, skillBookId, quantity, request } = params;
	if (!Number.isSafeInteger(skillBookId) || skillBookId <= 0) return {
		code: "INVALID_PARAM",
		message: "功法模板ID无效"
	};
	if (!Number.isSafeInteger(quantity) || quantity < 1) return {
		code: "INVALID_PARAM",
		message: "数量必须是大于0的整数"
	};
	try {
		const result = params.load ? await params.load() : await requestBackend(bid, "post_players_id_mingwu_dan_confirm", {
			path: { id: uid },
			body: {
				skillBookId,
				quantity
			},
			headers: repeatPresentationHeaders(params.messageText),
			...writeContext(request)
		});
		if (typeof result.message !== "string" || typeof result.skillBookName !== "string" || ![
			result.proficiencyGain,
			result.currentProficiency,
			result.remainingCount,
			result.consumedCount
		].every((value) => Number.isSafeInteger(value) && value >= 0) || typeof result.guidanceText !== "string" || typeof result.canContinue !== "boolean") throw new Error("明悟丹确认回执不完整");
		return {
			code: "OK",
			data: {
				message: result.message,
				proficiencyGain: result.proficiencyGain,
				currentProficiency: result.currentProficiency,
				skillBookName: result.skillBookName,
				remainingCount: result.remainingCount,
				consumedCount: result.consumedCount,
				guidanceText: result.guidanceText,
				canContinue: result.canContinue
			}
		};
	} catch (error) {
		return {
			code: "FAILED",
			message: error?.message ?? "明悟丹参悟失败"
		};
	}
}

//#endregion
export { App as default };