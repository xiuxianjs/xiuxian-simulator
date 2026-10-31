import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";

//#region src/api/bot/storyline-sweep.ts
const row = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("主线扫荡响应不完整");
	return value;
};
const nonnegative = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
function item(value) {
	const data = row(value);
	if (!nonnegative(data.itemId) || !nonnegative(data.amount) || typeof data.name !== "string") throw new Error("主线扫荡掉落响应不完整");
	return {
		itemId: data.itemId,
		amount: data.amount,
		name: data.name
	};
}
function parseStorylineSweep(value) {
	const data = row(value);
	if (typeof data.stageLabel !== "string" || !nonnegative(data.times) || !nonnegative(data.totalSpiritCost) || !nonnegative(data.totalExp) || !nonnegative(data.totalSpiritStone) || !integer(data.totalBonusExp) || !nonnegative(data.totalExp + data.totalBonusExp) || typeof data.expBonusText !== "string" || !Array.isArray(data.allItemsGained)) throw new Error("主线扫荡响应不完整");
	return {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		stageLabel: data.stageLabel,
		times: data.times,
		totalSpiritCost: data.totalSpiritCost,
		totalExp: data.totalExp,
		totalSpiritStone: data.totalSpiritStone,
		totalBonusExp: data.totalBonusExp,
		expBonusText: data.expBonusText,
		allItemsGained: data.allItemsGained.map(item)
	};
}
async function sweepBackendStoryline(bid, uid, chapterNumber, stageNumber, times, request, repeatCommand) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("主线扫荡操作参数无效");
	return parseStorylineSweep(await requestBackend(bid, "post_players_id_storyline_sweep", {
		path: { id: uid },
		body: {
			chapterNumber,
			stageNumber,
			times
		},
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseStorylineSweepBusiness(value) {
	const data = row(value);
	if (data.outcome === "ignored") return { ignored: true };
	if (!(typeof data.chapterNumber === "number" && Number.isInteger(data.chapterNumber) && Number.isFinite(data.chapterNumber)) || data.chapterNumber < 1 || !nonnegative(data.stageNumber) || data.stageNumber < 1 || data.stageNumber > 4) throw new Error("主线扫荡响应不完整");
	return {
		ignored: false,
		chapterNumber: data.chapterNumber,
		stageNumber: data.stageNumber,
		result: parseStorylineSweep(data.result)
	};
}

//#endregion
export { parseStorylineSweep, parseStorylineSweepBusiness, sweepBackendStoryline };