import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/soul-artifact-grade-upgrade.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("本命物升品接口响应不完整");
	return value;
}
function integer(value, field, allowZero = false) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || !allowZero && value <= 0) throw new Error(`本命物升品接口字段无效: ${field}`);
	return value;
}
async function upgradeBackendSoulArtifactGrade(bid, uid, artifactId, request) {
	if (!bid) throw new Error("缺少平台身份");
	return parseSoulArtifactGradeUpgrade(await requestBackend(bid, "post_players_id_soul_artifacts_grade_upgrade", {
		path: { id: uid },
		body: artifactId === void 0 ? {} : { artifactId },
		...writeContext(request)
	}));
}
function parseSoulArtifactGradeUpgrade(value) {
	const data = record(value);
	const artifact = record(data.artifact);
	if (typeof artifact.name !== "string") throw new Error("本命物升品接口字段无效: artifact.name");
	if (typeof data.previousGradeName !== "string" || !data.previousGradeName || typeof data.newGradeName !== "string" || !data.newGradeName) throw new Error("本命物升品接口字段无效: gradeName");
	return {
		artifact: {
			id: integer(artifact.id, "artifact.id"),
			artifactId: integer(artifact.artifactId, "artifact.artifactId"),
			name: artifact.name,
			gradeId: integer(artifact.gradeId, "artifact.gradeId"),
			level: integer(artifact.level, "artifact.level", true)
		},
		consumed: integer(data.consumed, "consumed"),
		previousGrade: integer(data.previousGrade, "previousGrade"),
		newGrade: integer(data.newGrade, "newGrade"),
		previousGradeName: data.previousGradeName,
		newGradeName: data.newGradeName
	};
}

//#endregion
export { parseSoulArtifactGradeUpgrade, upgradeBackendSoulArtifactGrade };