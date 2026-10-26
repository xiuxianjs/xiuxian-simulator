import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/soul-artifact-wash.ts
const actions = /* @__PURE__ */ new Set([
	"add",
	"replace",
	"upgrade"
]);
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("本命物洗涤响应不完整");
	return value;
}
function positiveInteger(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("本命物洗涤响应不完整");
	return value;
}
function parseStep(value) {
	const source = row(value);
	if (typeof source.success !== "boolean") throw new Error("本命物洗涤响应不完整");
	if (source.action !== void 0 && (typeof source.action !== "string" || !actions.has(source.action))) throw new Error("本命物洗涤响应不完整");
	if (source.message !== void 0 && typeof source.message !== "string") throw new Error("本命物洗涤响应不完整");
	if (source.details !== void 0 && (!Array.isArray(source.details) || source.details.some((item) => typeof item !== "string"))) throw new Error("本命物洗涤响应不完整");
	return {
		success: source.success,
		...source.action === void 0 ? {} : { action: source.action },
		...source.message === void 0 ? {} : { message: source.message },
		...source.details === void 0 ? {} : { details: source.details }
	};
}
function parsePending(value) {
	const source = row(value);
	const instanceId = positiveInteger(source.instanceId);
	const artifactId = positiveInteger(source.artifactId);
	const times = positiveInteger(source.times);
	const totalSuccess = positiveInteger(source.totalSuccess);
	const createdAt = positiveInteger(source.createdAt);
	if (typeof source.artifactName !== "string" || typeof source.finalMessage !== "string" || !Array.isArray(source.results)) throw new Error("本命物洗涤响应不完整");
	const results = source.results.map(parseStep);
	if (results.length !== totalSuccess || results.some((item) => !item.success)) throw new Error("本命物洗涤响应不完整");
	return {
		instanceId,
		artifactId,
		artifactName: source.artifactName,
		times,
		totalSuccess,
		createdAt,
		finalMessage: source.finalMessage,
		results
	};
}
async function previewBackendSoulArtifactWash(bid, uid, times, request) {
	if (!bid) throw new Error("缺少平台身份");
	return parseSoulArtifactWashPreview(await requestBackend(bid, "post_players_id_soul_artifacts_wash", {
		path: { id: uid },
		body: { times },
		...writeContext(request)
	}));
}
function parseSoulArtifactWashPreview(value) {
	return { pending: parsePending(row(value).pending) };
}
async function confirmBackendSoulArtifactWash(bid, uid, request) {
	if (!bid) throw new Error("缺少平台身份");
	return parseSoulArtifactWashConfirm(await requestBackend(bid, "post_players_id_soul_artifacts_wash_confirm", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseSoulArtifactWashConfirm(value) {
	const data = row(value);
	if (typeof data.message !== "string") throw new Error("本命物洗涤响应不完整");
	return {
		pending: parsePending(data.pending),
		message: data.message
	};
}

//#endregion
export { confirmBackendSoulArtifactWash, parseSoulArtifactWashConfirm, parseSoulArtifactWashPreview, previewBackendSoulArtifactWash };