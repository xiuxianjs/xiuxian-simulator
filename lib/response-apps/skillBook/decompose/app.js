import { decomposeBackendSkillBook } from "../../../api/bot/skill-book-decompose.js";

//#region src/response-apps/skillBook/decompose/app.ts
async function App(params) {
	try {
		const result = await decomposeBackendSkillBook(params.bid, params.uid, params.skillBookId, params.request, params.messageText);
		return {
			code: "OK",
			data: {
				result: {
					success: true,
					refundInfo: {
						skillBook: {
							name: result.name,
							skillType: result.skillType,
							grade: result.grade,
							realm: result.realm
						},
						totalExp: result.refundExp,
						baseExp: result.baseExp,
						items: result.refundedItems
					}
				},
				skillBookId: params.skillBookId
			}
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "分解功法失败，请稍后再试或联系运营。";
		if (message === "储物袋中没有功法") return {
			code: "NO_SKILL_BOOKS",
			data: { message }
		};
		if (message === `找不到ID为 ${params.skillBookId} 的功法`) return {
			code: "NOT_FOUND",
			data: {
				message,
				skillBookId: params.skillBookId
			}
		};
		return {
			code: "FAILED",
			data: { message }
		};
	}
}

//#endregion
export { App as default };