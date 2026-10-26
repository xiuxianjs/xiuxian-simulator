import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/demon-tower-actions.ts
function row(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function nonNegativeInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function positiveInteger(value) {
	return nonNegativeInteger(value) && value > 0;
}
function requireWriteParams(bid, uid) {
	if (!bid?.trim() || !positiveInteger(uid)) throw new Error("妖塔操作参数无效");
}
function parseReset(value) {
	const data = row(value, "妖塔重置响应不完整");
	if (data.success !== true || typeof data.message !== "string" || !positiveInteger(data.resetsUsed) || !positiveInteger(data.maxResets)) throw new Error("妖塔重置响应不完整");
	return {
		success: true,
		message: data.message,
		resetsUsed: data.resetsUsed,
		maxResets: data.maxResets
	};
}
function parseSweep(value) {
	const data = row(value, "妖塔扫荡响应不完整");
	if (!positiveInteger(data.layersSwept) || !nonNegativeInteger(data.totalSpiritStone) || !nonNegativeInteger(data.totalScore) || !nonNegativeInteger(data.cumulativeStars) || !positiveInteger(data.nextLayer) || !nonNegativeInteger(data.buffsToSelect) || !Array.isArray(data.milestonesTriggered) || !Array.isArray(data.availableBuffs)) throw new Error("妖塔扫荡响应不完整");
	const milestonesTriggered = data.milestonesTriggered.map((value) => {
		const milestone = row(value, "妖塔扫荡里程碑响应不完整");
		if (!positiveInteger(milestone.id) || !positiveInteger(milestone.stars) || !nonNegativeInteger(milestone.score)) throw new Error("妖塔扫荡里程碑响应不完整");
		return {
			id: milestone.id,
			stars: milestone.stars,
			score: milestone.score
		};
	});
	const availableBuffs = data.availableBuffs.map((value) => {
		const buff = row(value, "妖塔扫荡 Buff 响应不完整");
		if (typeof buff.key !== "string" || typeof buff.label !== "string" || typeof buff.cnKey !== "string") throw new Error("妖塔扫荡 Buff 响应不完整");
		return {
			key: buff.key,
			label: buff.label,
			cnKey: buff.cnKey
		};
	});
	return {
		layersSwept: data.layersSwept,
		totalSpiritStone: data.totalSpiritStone,
		totalScore: data.totalScore,
		cumulativeStars: data.cumulativeStars,
		milestonesTriggered,
		nextLayer: data.nextLayer,
		buffsToSelect: data.buffsToSelect,
		availableBuffs
	};
}
async function resetBackendDemonTower(bid, uid, request, repeatCommand) {
	requireWriteParams(bid, uid);
	return parseReset(await requestBackend(bid, "post_players_id_tower_reset", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		...writeContext(request)
	}));
}
async function sweepBackendDemonTower(bid, uid, request) {
	requireWriteParams(bid, uid);
	return parseSweep(await requestBackend(bid, "post_players_id_tower_sweep", {
		headers: repeatPresentationHeaders("妖塔扫荡"),
		path: { id: uid },
		...writeContext(request)
	}));
}
async function selectBackendDemonTowerBuff(bid, uid, buffKey, count, request) {
	requireWriteParams(bid, uid);
	if (!buffKey.trim() || !Number.isInteger(count) || count < 1) throw new Error("妖塔 Buff 参数无效");
	return await requestBackend(bid, "post_players_id_tower_buffs", {
		headers: repeatPresentationHeaders("妖塔选buff"),
		path: { id: uid },
		body: {
			buffKey,
			count
		},
		...writeContext(request)
	});
}
async function challengeBackendDemonTower(bid, uid, stars, request) {
	requireWriteParams(bid, uid);
	if (!Number.isInteger(stars) || stars < 1 || stars > 3) throw new Error("星级只能是 1、2 或 3");
	return await requestBackend(bid, "post_players_id_tower_challenge", {
		headers: repeatPresentationHeaders("妖塔挑战"),
		path: { id: uid },
		body: { stars },
		...writeContext(request)
	});
}
function demonTowerBuffArguments(messageText) {
	const match = messageText.match(/妖塔选buff\s+(hp|atk|critDmg|生命|攻击|暴伤)(?:\s+(\d+))?/i);
	if (!match) return { selection: null };
	const count = Math.max(1, parseInt(match[2] || "1", 10));
	return { selection: {
		buffKey: match[1],
		count: Number.isFinite(count) ? count : null
	} };
}
function parseRobotDemonTowerBuff(value) {
	const result = row(value, "妖塔 Buff 响应不完整");
	if (result.outcome === "usage") return { outcome: "usage" };
	if (result.outcome !== "result") throw new Error("妖塔 Buff 响应不完整");
	const data = row(result.data, "妖塔 Buff 响应不完整");
	const buffs = row(data.newBuffs, "妖塔 Buff 响应不完整");
	if (!(typeof data.count === "number" && Number.isInteger(data.count) && data.count > 0) || typeof data.buffApplied !== "string" || !(typeof data.remainingBuffSelections === "number" && Number.isInteger(data.remainingBuffSelections) && data.remainingBuffSelections >= 0) || !Array.isArray(data.buffOptions)) throw new Error("妖塔 Buff 响应不完整");
	const buffNumber = (value) => {
		if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("妖塔 Buff 响应不完整");
		return value;
	};
	return {
		outcome: "result",
		data: {
			count: data.count,
			buffApplied: data.buffApplied,
			newBuffs: {
				hp: buffNumber(buffs.hp),
				atk: buffNumber(buffs.atk),
				critDmg: buffNumber(buffs.critDmg)
			},
			remainingBuffSelections: data.remainingBuffSelections,
			buffOptions: data.buffOptions.map((value) => {
				const option = row(value, "妖塔 Buff 响应不完整");
				if (typeof option.key !== "string" || typeof option.label !== "string" || typeof option.cnKey !== "string") throw new Error("妖塔 Buff 响应不完整");
				return {
					key: option.key,
					label: option.label,
					cnKey: option.cnKey
				};
			})
		}
	};
}

//#endregion
export { challengeBackendDemonTower, demonTowerBuffArguments, parseReset, parseRobotDemonTowerBuff, parseSweep, resetBackendDemonTower, selectBackendDemonTowerBuff, sweepBackendDemonTower };