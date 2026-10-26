import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/lingzhi-guide.ts
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function requireBid(bid) {
	if (!bid?.trim()) throw new Error("操作缺少平台身份");
}
function parseSession(value) {
	if (!isRecord(value)) throw new Error("灵药师引导响应不完整");
	if (!([
		1,
		2,
		3,
		4
	].includes(value.step) && Number.isInteger(value.createTime) && Number.isInteger(value.expireTime) && Number.isInteger(value.version) && value.version >= 1)) throw new Error("灵药师引导响应不完整");
	return {
		step: value.step,
		createTime: value.createTime,
		expireTime: value.expireTime,
		version: value.version
	};
}
function parseLingzhiGuideState(value) {
	if (!isRecord(value) || typeof value.completed !== "boolean") throw new Error("灵药师引导响应不完整");
	const activation = isRecord(value.activation) && typeof value.activation.message === "string" ? { message: value.activation.message } : void 0;
	if (value.session === void 0 || value.session === null) return {
		completed: value.completed,
		...activation ? { activation } : {}
	};
	return {
		session: parseSession(value.session),
		completed: value.completed
	};
}
async function startBackendLingzhiGuide(bid, uid, request, repeatCommand) {
	requireBid(bid);
	return parseLingzhiGuideState(await requestBackend(bid, "post_players_id_professions_lingzhi_guide_start", {
		path: { id: uid },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
async function continueCurrentBackendLingzhiGuide(bid, uid, request, repeatCommand) {
	requireBid(bid);
	return parseLingzhiGuideState(await requestBackend(bid, "post_players_id_professions_lingzhi_guide_continue_current", {
		path: { id: uid },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}

//#endregion
export { continueCurrentBackendLingzhiGuide, parseLingzhiGuideState, startBackendLingzhiGuide };