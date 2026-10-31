import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";

//#region src/api/bot/dungeon-sweep.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function reward(value) {
	if (!record(value) || typeof value.category !== "string" || typeof value.name !== "string" || !integer(value.amount)) throw new Error("秘境扫荡奖励响应不完整");
	return {
		category: value.category,
		name: value.name,
		amount: value.amount
	};
}
function parseDungeonSweep(value) {
	if (!record(value) || typeof value.dungeonName !== "string" || !integer(value.times) || !integer(value.totalSpiritCost) || !integer(value.totalExp) || !Array.isArray(value.currency) || !Array.isArray(value.items)) throw new Error("秘境扫荡响应不完整");
	if (value.normalItems !== void 0 && !Array.isArray(value.normalItems)) throw new Error("普通秘境掉落响应无效");
	return {
		treasureEffects: parseTreasureEffects(value.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(value.normalExperienceGained),
		normalItems: value.normalItems?.map(reward),
		dungeonName: value.dungeonName,
		times: value.times,
		totalSpiritCost: value.totalSpiritCost,
		totalExp: value.totalExp,
		currency: value.currency.map(reward),
		items: value.items.map(reward)
	};
}
function requireParams(bid, uid) {
	if (!bid || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("秘境扫荡请求参数无效");
}
async function sweepBackendDungeon(bid, uid, dungeonName, times, request, repeatCommand) {
	requireParams(bid, uid);
	return parseDungeonSweep(await requestBackend(bid, "post_players_id_dungeons_sweep", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body: {
			dungeonName,
			times
		},
		...writeContext(request)
	}));
}
async function sweepBackendFreeDungeons(bid, uid, request, repeatCommand) {
	requireParams(bid, uid);
	return parseDungeonFreeSweep(await requestBackend(bid, "post_players_id_dungeons_sweep_free", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseDungeonFreeSweep(value) {
	if (!record(value) || !Array.isArray(value.sweptDungeons) || !integer(value.totalTimes) || !integer(value.totalExp) || !integer(value.totalSpiritCost)) throw new Error("免费秘境扫荡响应不完整");
	const skipped = value.skippedDungeons === void 0 ? [] : value.skippedDungeons;
	if (!Array.isArray(skipped)) throw new Error("免费秘境扫荡未完成记录响应不完整");
	const skippedDungeons = skipped.map((item) => {
		if (!record(item) || typeof item.dungeonName !== "string" || typeof item.message !== "string") throw new Error("免费秘境扫荡未完成记录响应不完整");
		return {
			dungeonName: item.dungeonName,
			message: item.message
		};
	});
	return {
		treasureEffects: parseTreasureEffects(value.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(value.normalExperienceGained),
		skippedDungeons,
		sweptDungeons: value.sweptDungeons.map(parseDungeonSweep),
		totalTimes: value.totalTimes,
		totalExp: value.totalExp,
		totalSpiritCost: value.totalSpiritCost
	};
}

//#endregion
export { parseDungeonFreeSweep, parseDungeonSweep, sweepBackendDungeon, sweepBackendFreeDungeons };