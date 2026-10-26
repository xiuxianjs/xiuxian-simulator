import { requestBackend } from "./client.js";

//#region src/api/bot/combat-power-achievement-query.ts
const message = "战力成就响应不完整";
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
	return value;
}
function integer(value) {
	const result = number(value);
	if (!Number.isSafeInteger(result)) throw new Error(message);
	return result;
}
function text(value) {
	if (typeof value !== "string") throw new Error(message);
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error(message);
	return value;
}
function card(value) {
	const row = record(value);
	const id = integer(row.id);
	if (id < 0) throw new Error(message);
	return {
		id,
		name: text(row.name),
		description: text(row.description),
		threshold: number(row.threshold),
		rewardText: text(row.rewardText)
	};
}
async function getBackendCombatPowerAchievements(bid, uid) {
	return validateBackendCombatPowerAchievements(await requestBackend(bid, "get_players_id_achievements_combat_power", { path: { id: uid } }));
}
function validateBackendCombatPowerAchievements(data) {
	const row = record(data);
	if (!Array.isArray(row.items)) throw new Error(message);
	const current = row.currentClaimable === null ? null : record(row.currentClaimable);
	const next = row.nextTarget === null ? null : record(row.nextTarget);
	return {
		currentPower: integer(row.currentPower),
		totalCount: integer(row.totalCount),
		completedCount: integer(row.completedCount),
		claimableCount: integer(row.claimableCount),
		allCompleted: boolean(row.allCompleted),
		currentClaimable: current === null ? null : {
			...card(current),
			remainingClaimableCount: integer(current.remainingClaimableCount)
		},
		nextTarget: next === null ? null : {
			...card(next),
			remainingPower: number(next.remainingPower)
		},
		items: row.items.map((value) => {
			const item = record(value);
			return {
				...card(item),
				completed: boolean(item.completed),
				claimed: boolean(item.claimed),
				reachable: boolean(item.reachable)
			};
		})
	};
}

//#endregion
export { getBackendCombatPowerAchievements, validateBackendCombatPowerAchievements };