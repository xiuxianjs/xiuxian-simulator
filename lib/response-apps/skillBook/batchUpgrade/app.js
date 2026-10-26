import { batchUpgradeBackendSkillBook } from "../../../api/bot/skill-book-batch-upgrade.js";

//#region src/response-apps/skillBook/batchUpgrade/app.ts
async function App(params) {
	try {
		const result = await batchUpgradeBackendSkillBook(params.bid, params.uid, params.skillBookId, params.upgradeCount, params.request);
		if (result.outcome === "no_skill_books") return {
			code: "NO_SKILL_BOOKS",
			data: { message: "您还没有已学习的功法" }
		};
		if (result.outcome === "not_found") return {
			code: "NOT_FOUND",
			data: {
				message: `找不到ID为 ${params.skillBookId} 的已学功法`,
				skillBookId: params.skillBookId
			}
		};
		return {
			code: "OK",
			data: {
				target: result.target,
				successCount: result.successCount,
				totalConsumedExp: result.totalConsumedExp,
				totalConsumedSpiritStone: result.totalConsumedSpiritStone,
				lastUpgradeCount: result.lastUpgradeCount,
				attributeLines: result.attributeLines,
				stopReason: result.stopReason,
				upgradeCount: result.upgradeCount,
				skillBookId: result.skillBookId
			}
		};
	} catch {
		return {
			code: "LOAD_FAILED",
			data: { message: "升级功法失败，请稍后再试或联系运营。" }
		};
	}
}

//#endregion
export { App as default };