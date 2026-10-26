import { batchLearnCurrentBackendSkillBooks, getBackendSkillBookBatchLearnCandidates } from "../../../api/bot/skill-book-batch-learn.js";

//#region src/response-apps/skillBook/batchLearn/app.ts
async function App(params) {
	try {
		const command = params.previewOnly ? void 0 : await batchLearnCurrentBackendSkillBooks(params.bid, params.uid, params.request);
		const candidates = command?.selection ?? await getBackendSkillBookBatchLearnCandidates(params.bid, params.uid);
		const learnList = candidates.candidates.map(({ name, skillType }) => ({
			name,
			skillType
		}));
		const skippedConflicts = candidates.skippedConflicts.map(({ name, skillType }) => ({
			name,
			skillType
		}));
		if (learnList.length === 0) return {
			code: "NO_AVAILABLE",
			data: { message: "暂无可学习的功法" }
		};
		if (params.previewOnly) return {
			code: "PREVIEW",
			data: {
				learnList,
				skippedConflicts
			}
		};
		const results = command?.results ?? [];
		const successList = [];
		const failList = [];
		for (const result of results) {
			if (result.success && result.skillBook) {
				successList.push(result.skillBook);
				continue;
			}
			failList.push({
				name: result.skillBook?.name ?? "未知功法",
				skillType: result.skillBook?.skillType ?? "未知",
				reason: result.message
			});
		}
		return {
			code: "OK",
			data: {
				successList,
				failList,
				skippedConflicts
			}
		};
	} catch (_error) {
		return {
			code: "LOAD_FAILED",
			data: { message: "一键学习功法失败，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default };