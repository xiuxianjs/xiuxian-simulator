import { batchDecomposeBackendEquipment, previewBackendEquipmentBatchDecompose } from "../../../api/bot/equipment-batch-decompose.js";

//#region src/response-apps/equipment/batchDecompose/app.ts
/**
* 一键分解装备
* @param params.uid 用户 ID
* @param params.gradeId 可选品级 ID，用于按品级过滤
*/
async function App(params) {
	const result = await batchDecomposeBackendEquipment(params.bid, params.uid, params.gradeId, params.request);
	if (!result.success) return {
		code: "FAIL",
		data: { message: result.message }
	};
	return {
		code: "OK",
		data: {
			message: result.message,
			decomposedCount: result.decomposedCount,
			remainingCount: result.remainingCount,
			details: result.details,
			totalYield: result.totalYield
		}
	};
}
/**
* 预览一键分解装备（不执行分解）
* @param params.uid 用户 ID
* @param params.gradeId 可选品级 ID，用于按品级过滤
*/
async function previewApp(params) {
	const result = params.prepared ?? await previewBackendEquipmentBatchDecompose(params.bid, params.uid, params.gradeId);
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
			totalYield: result.totalYield
		}
	};
}
/**
* 查询可分解装备的品级选项（按品级分组统计数量）
* @param uid 用户 ID
*/
async function fetchGradeOptionsApp(bid, uid, prepared) {
	const result = prepared ?? await previewBackendEquipmentBatchDecompose(bid, uid);
	if (!result.success) return {
		code: "OK",
		data: {
			totalCount: 0,
			grades: []
		}
	};
	return {
		code: "OK",
		data: {
			totalCount: result.totalCount,
			grades: result.gradeBreakdown.map((grade) => ({
				id: grade.id,
				name: grade.gradeName,
				level: grade.level,
				count: grade.count
			}))
		}
	};
}

//#endregion
export { App as default, fetchGradeOptionsApp, previewApp };