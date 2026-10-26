import { getBackendWudaoOptions, wudaoBackendSkillBook } from "../../../api/bot/skill-book-wudao.js";

//#region src/response-apps/skillBook/wudao/app.ts
function options(value) {
	return value.map((option) => ({
		label: option.label,
		attr: option.key,
		isPercent: option.isPercent,
		currentMaxText: option.currentMaxText,
		templateMaxText: option.templateMaxText
	}));
}
async function prepareWudao(params) {
	try {
		const data = params.prepared ?? await getBackendWudaoOptions(params.bid, params.uid, params.userSkillBookId);
		if (data.status === "no_stone") return {
			code: "NO_STONE",
			data: { message: data.message }
		};
		if (data.status === "no_record") return {
			code: "NO_RECORD",
			data: { message: data.message }
		};
		if (data.status === "no_attrs") return {
			code: "NO_ATTRS",
			data: {
				message: data.message,
				skillBookName: data.skillBookName
			}
		};
		const available = options(data.options);
		return {
			code: "OK",
			data: {
				skillBookName: data.skillBookName,
				ownedQty: data.ownedStones,
				available
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "悟道准备失败，请稍后再试或联系运营。" }
		};
	}
}
async function executeWudao(params) {
	try {
		if (params.failure) throw new Error(params.failure);
		return {
			code: "OK",
			data: params.prepared ?? await wudaoBackendSkillBook(params.bid, params.uid, params.userSkillBookId, params.attrKey, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "悟道失败，请稍后再试或联系运营。" }
		};
	}
}

//#endregion
export { executeWudao, prepareWudao };