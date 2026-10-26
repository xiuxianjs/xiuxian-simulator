import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/soul-artifact-upgrade.ts
const comparisonKeys = /* @__PURE__ */ new Set([
	"patk",
	"matk",
	"pdef",
	"mdef",
	"hp",
	"speed"
]);
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("本命物升级响应不完整");
	return value;
}
function nonnegativeInteger(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`本命物升级响应字段无效: ${field}`);
	return value;
}
function finiteNumber(value, field) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`本命物升级响应字段无效: ${field}`);
	return value;
}
async function upgradeBackendSoulArtifactLevel(bid, uid, levels, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseSoulArtifactLevelUpgrade(await requestBackend(bid, "post_players_id_soul_artifacts_upgrade", {
		path: { id: uid },
		body: { levels },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseSoulArtifactLevelUpgrade(value) {
	const response = record(value);
	const artifact = record(response.artifact);
	if (typeof artifact.name !== "string") throw new Error("本命物升级响应字段无效: artifact.name");
	if (!Array.isArray(response.comparison) || typeof response.message !== "string" || !Array.isArray(response.compareLines) || !response.compareLines.every((line) => typeof line === "string")) throw new Error("本命物升级响应字段无效: comparison");
	const comparison = response.comparison.map((value) => {
		const row = record(value);
		if (typeof row.key !== "string" || !comparisonKeys.has(row.key)) throw new Error("本命物升级响应字段无效: comparison.key");
		return {
			key: row.key,
			before: finiteNumber(row.before, "comparison.before"),
			after: finiteNumber(row.after, "comparison.after")
		};
	});
	return {
		artifact: {
			id: nonnegativeInteger(artifact.id, "artifact.id"),
			name: artifact.name,
			level: nonnegativeInteger(artifact.level, "artifact.level")
		},
		previousLevel: nonnegativeInteger(response.previousLevel, "previousLevel"),
		actualLevels: nonnegativeInteger(response.actualLevels, "actualLevels"),
		cost: nonnegativeInteger(response.cost, "cost"),
		comparison,
		message: response.message,
		compareLines: response.compareLines
	};
}
function parseRobotSoulArtifactUpgrade(value) {
	const data = record(value);
	if (typeof data.message !== "string") throw new Error("本命物升级响应不完整");
	return {
		result: parseSoulArtifactLevelUpgrade(data.result),
		message: data.message
	};
}

//#endregion
export { parseRobotSoulArtifactUpgrade, parseSoulArtifactLevelUpgrade, upgradeBackendSoulArtifactLevel };