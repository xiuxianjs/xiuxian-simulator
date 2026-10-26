import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/soul-artifact-unequip.ts
async function unequipBackendSoulArtifact(bid, uid, request) {
	if (!bid) throw new Error("缺少平台身份");
	const result = parseSoulArtifactUnequipResult(await requestBackend(bid, "post_players_id_soul_artifacts_unequip", {
		path: { id: uid },
		...writeContext(request)
	}));
	if (result.outcome === "confirmation") throw new Error("分离本命物响应不完整");
	return result;
}
function parseSoulArtifactUnequipResult(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("分离本命物响应不完整");
	const response = data;
	const artifact = response.artifact;
	if (response.outcome === "not_equipped") {
		if (artifact !== null) throw new Error("分离本命物响应不完整");
		return {
			outcome: "not_equipped",
			artifact: null
		};
	}
	if (response.outcome !== "unequipped" && response.outcome !== "confirmation" || !artifact || typeof artifact !== "object" || Array.isArray(artifact)) throw new Error("分离本命物响应不完整");
	const row = artifact;
	const count = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
	if (row.name !== null && typeof row.name !== "string" || !count(row.previousLevel) || !count(row.totalCost) || !count(row.refundQuantity)) throw new Error("分离本命物响应不完整");
	return {
		outcome: response.outcome,
		artifact: {
			name: row.name,
			previousLevel: row.previousLevel,
			totalCost: row.totalCost,
			refundQuantity: row.refundQuantity
		}
	};
}

//#endregion
export { parseSoulArtifactUnequipResult, unequipBackendSoulArtifact };