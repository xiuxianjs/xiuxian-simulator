import { requestBackend } from "./client.js";

//#region src/api/bot/demon-tower-info-query.ts
function object(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function number(value, message) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
	return value;
}
function boolean(value, message) {
	if (typeof value !== "boolean") throw new Error(message);
	return value;
}
function text(value, message) {
	if (typeof value !== "string") throw new Error(message);
	return value;
}
function availability(value) {
	const row = object(value, "妖塔操作资格响应不完整");
	return {
		available: boolean(row.available, "妖塔操作资格响应不完整"),
		reason: text(row.reason, "妖塔操作资格响应不完整")
	};
}
function parseInfo(value) {
	const row = object(value, "妖塔信息响应不完整");
	const monsterPower = object(row.monsterPower, "妖塔怪物战力响应不完整");
	const buffs = object(row.buffs, "妖塔 Buff 响应不完整");
	const milestones = object(row.milestones, "妖塔里程碑响应不完整");
	const next = milestones.next === null ? null : object(milestones.next, "妖塔下一里程碑响应不完整");
	if (!Array.isArray(row.bestStarsByLayer) || !Array.isArray(row.availableBuffs)) throw new Error("妖塔列表响应不完整");
	return {
		hasStarted: boolean(row.hasStarted, "妖塔信息响应不完整"),
		isFinished: boolean(row.isFinished, "妖塔信息响应不完整"),
		currentLayer: number(row.currentLayer, "妖塔信息响应不完整"),
		currentStage: number(row.currentStage, "妖塔信息响应不完整"),
		currentLayerStars: number(row.currentLayerStars, "妖塔信息响应不完整"),
		cumulativeStars: number(row.cumulativeStars, "妖塔信息响应不完整"),
		totalScore: number(row.totalScore, "妖塔信息响应不完整"),
		totalSpiritStone: number(row.totalSpiritStone, "妖塔信息响应不完整"),
		sweepableLayers: number(row.sweepableLayers, "妖塔信息响应不完整"),
		sweepableLayersText: text(row.sweepableLayersText, "妖塔信息响应不完整"),
		userPower: number(row.userPower, "妖塔信息响应不完整"),
		monsterPower: {
			star1: number(monsterPower.star1, "妖塔怪物战力响应不完整"),
			star2: number(monsterPower.star2, "妖塔怪物战力响应不完整"),
			star3: number(monsterPower.star3, "妖塔怪物战力响应不完整")
		},
		targetLayer: number(row.targetLayer, "妖塔信息响应不完整"),
		buffs: {
			hp: number(buffs.hp, "妖塔 Buff 响应不完整"),
			atk: number(buffs.atk, "妖塔 Buff 响应不完整"),
			critDmg: number(buffs.critDmg, "妖塔 Buff 响应不完整")
		},
		buffText: text(row.buffText, "妖塔信息响应不完整"),
		conditionLabel: text(row.conditionLabel, "妖塔信息响应不完整"),
		bestStarsByLayer: row.bestStarsByLayer.map((value) => {
			const item = object(value, "妖塔历史星数响应不完整");
			return {
				layer: number(item.layer, "妖塔历史星数响应不完整"),
				stars: number(item.stars, "妖塔历史星数响应不完整")
			};
		}),
		maxRecordedLayer: number(row.maxRecordedLayer, "妖塔历史星数响应不完整"),
		totalBestStars: number(row.totalBestStars, "妖塔历史星数响应不完整"),
		fullStarLayers: number(row.fullStarLayers, "妖塔历史星数响应不完整"),
		recordedLayers: number(row.recordedLayers, "妖塔历史星数响应不完整"),
		milestones: {
			claimedCount: number(milestones.claimedCount, "妖塔里程碑响应不完整"),
			totalCount: number(milestones.totalCount, "妖塔里程碑响应不完整"),
			next: next ? {
				stars: number(next.stars, "妖塔下一里程碑响应不完整"),
				score: number(next.score, "妖塔下一里程碑响应不完整")
			} : null
		},
		showChallengeButtons: boolean(row.showChallengeButtons, "妖塔按钮状态响应不完整"),
		showSweepButton: boolean(row.showSweepButton, "妖塔按钮状态响应不完整"),
		showResetButton: boolean(row.showResetButton, "妖塔按钮状态响应不完整"),
		challenge: availability(row.challenge),
		sweep: availability(row.sweep),
		reset: availability(row.reset),
		buffSelection: availability(row.buffSelection),
		availableBuffs: row.availableBuffs.map((value) => {
			const item = object(value, "妖塔可选 Buff 响应不完整");
			return {
				key: text(item.key, "妖塔可选 Buff 响应不完整"),
				label: text(item.label, "妖塔可选 Buff 响应不完整"),
				cnKey: text(item.cnKey, "妖塔可选 Buff 响应不完整"),
				minStars: number(item.minStars, "妖塔可选 Buff 响应不完整")
			};
		}),
		pendingBuffSelections: number(row.pendingBuffSelections, "妖塔信息响应不完整"),
		towerScore: number(row.towerScore, "妖塔信息响应不完整")
	};
}
async function getBackendDemonTowerInfo(bid, uid) {
	if (!bid?.trim() || !Number.isInteger(uid) || uid < 1) throw new Error("妖塔查询参数无效");
	return parseDemonTowerInfo(await requestBackend(bid, "get_players_id_tower", { path: { id: uid } }));
}
function parseDemonTowerInfo(value) {
	const response = object(value, "妖塔信息响应不完整");
	const access = object(response.access, "妖塔资格响应不完整");
	const parsedAccess = {
		ok: boolean(access.ok, "妖塔资格响应不完整"),
		realmName: text(access.realmName, "妖塔资格响应不完整")
	};
	if (!parsedAccess.ok) {
		if (response.info !== null) throw new Error("妖塔资格与信息不一致");
		return {
			access: parsedAccess,
			info: null
		};
	}
	return {
		access: parsedAccess,
		info: parseInfo(response.info)
	};
}

//#endregion
export { getBackendDemonTowerInfo, parseDemonTowerInfo };