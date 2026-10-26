import { batchDecomposeBackendSkillBooks, previewBackendSkillBookBatchDecompose } from "../../../api/bot/skill-book-batch-decompose.js";

//#region src/response-apps/skillBook/batchDecompose/app.ts
async function fetchGradeOptions(params) {
	try {
		const preview = params.prepared ?? await previewBackendSkillBookBatchDecompose(params.bid, params.uid);
		if (!preview.success) return {
			code: "EMPTY",
			data: { message: "暂无可分解的功法" }
		};
		return {
			code: "OK",
			data: {
				totalCount: preview.totalCount,
				grades: preview.gradeBreakdown.map((grade) => ({
					id: grade.id,
					name: grade.gradeName,
					level: grade.level,
					count: grade.count
				}))
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "一键分解功法失败，请稍后再试或联系运营。" }
		};
	}
}
async function executeDecompose(params) {
	try {
		const result = await batchDecomposeBackendSkillBooks(params.bid, params.uid, params.gradeId, params.request);
		if (!result.success) return {
			code: "FAIL",
			data: { message: result.message }
		};
		return {
			code: "OK",
			data: {
				decomposedCount: result.decomposedCount,
				remainingCount: result.remainingCount,
				totalExp: result.totalExp,
				items: result.items.map((item) => ({
					name: item.name,
					amount: item.quantity
				}))
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "❌ 分解失败，请稍后再试或联系运营。" }
		};
	}
}
async function previewDecompose(params) {
	try {
		const result = params.prepared ?? await previewBackendSkillBookBatchDecompose(params.bid, params.uid, params.gradeId);
		if (!result.success) return {
			code: "FAIL",
			data: { message: result.message }
		};
		return {
			code: "OK",
			data: {
				totalCount: result.totalCount,
				processCount: result.processCount,
				remainingCount: result.remainingCount,
				gradeBreakdown: result.gradeBreakdown,
				totalExp: result.totalExp,
				estimatedItems: result.estimatedItems.map((item) => ({
					name: item.name,
					amount: item.quantity
				}))
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "预览失败，请稍后再试。" }
		};
	}
}

//#endregion
export { executeDecompose, fetchGradeOptions, previewDecompose };