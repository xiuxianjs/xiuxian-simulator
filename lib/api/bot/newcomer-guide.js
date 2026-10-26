import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/newcomer-guide.ts
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function isGuideProgress(data) {
	return object(data) && typeof data.version === "number" && Number.isSafeInteger(data.version) && data.version >= 0 && data.expiresAt === null && (data.step === null || typeof data.step === "number" && [
		2,
		3,
		4,
		5
	].includes(data.step));
}
function requireGuideProgress(data) {
	if (!isGuideProgress(data)) throw new Error("新手引导状态接口返回不完整，请更新服务端后重试");
	return data;
}
async function getBackendNewcomerGuide(bid, uid, request) {
	return requireGuideProgress(await requestBackend(bid, "get_players_id_guides_newcomer", {
		path: { id: uid },
		requestId: request?.requestId
	}));
}
function requireGuideAction(data) {
	if (!object(data) || ![
		"step-3",
		"step-4",
		"step-5",
		"promotion-failed",
		"completed",
		"skipped",
		"cleared"
	].includes(data.action) || !isGuideProgress(data.progress) || !object(data.presentation) || typeof data.presentation.title !== "string" || typeof data.presentation.heading !== "string" || typeof data.presentation.text !== "string" || data.action !== "cleared" && data.presentation.text.length === 0 || typeof data.presentation.showActionBar !== "boolean" || !Array.isArray(data.presentation.advice) || !data.presentation.advice.every((tip) => object(tip) && typeof tip.command === "string" && typeof tip.description === "string")) throw new Error("新手引导动作接口返回不完整，请更新服务端后重试");
	return data;
}
async function continueBackendNewcomerGuide(bid, uid, expectedVersion, request) {
	return requireGuideAction(await requestBackend(bid, "post_players_id_guides_newcomer_continue", {
		path: { id: uid },
		body: { expectedVersion },
		...writeContext(request)
	}));
}
async function skipBackendNewcomerGuide(bid, uid, expectedVersion, request) {
	return requireGuideAction(await requestBackend(bid, "post_players_id_guides_newcomer_skip", {
		path: { id: uid },
		body: { expectedVersion },
		...writeContext(request)
	}));
}

//#endregion
export { continueBackendNewcomerGuide, getBackendNewcomerGuide, skipBackendNewcomerGuide };