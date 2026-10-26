import { requestBackend } from "./client.js";

//#region src/api/bot/battle-attributes.ts
function record(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
async function getBackendSoulPathComparison(bid, uid) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("战斗属性查询参数无效");
	return parseSoulPathComparison(record(await requestBackend(bid, "get_players_id_battle_attributes", { path: { id: uid } }), "战斗属性响应不完整").soulPathComparison);
}
function parseSoulPathComparison(value) {
	const comparison = record(value, "战斗属性响应不完整");
	if (!Array.isArray(comparison.changes) || typeof comparison.emptyMessage !== "string" || typeof comparison.quote !== "string") throw new Error("道途属性对比响应不完整");
	return {
		changes: comparison.changes.map((value) => {
			const change = record(value, "道途属性对比响应不完整");
			if (typeof change.label !== "string" || !Number.isInteger(change.before) || !Number.isInteger(change.after) || typeof change.deltaText !== "string") throw new Error("道途属性对比响应不完整");
			return {
				label: change.label,
				before: change.before,
				after: change.after,
				deltaText: change.deltaText
			};
		}),
		emptyMessage: comparison.emptyMessage,
		quote: comparison.quote
	};
}

//#endregion
export { getBackendSoulPathComparison, parseSoulPathComparison };