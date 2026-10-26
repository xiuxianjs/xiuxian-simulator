import { requestBackend } from "./client.js";

//#region src/api/bot/captcha-state.ts
function requireIdentity(bid, uid) {
	if (!bid?.trim()) throw new Error("验证码状态操作缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid <= 0) throw new Error("验证码状态操作缺少玩家身份");
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("验证码状态接口响应不完整");
	return value;
}
function integer(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
function nonNegativeInteger(value) {
	return integer(value) && value >= 0;
}
function ttl(value) {
	return integer(value) && value >= -2;
}
async function verifyBackendCaptcha(bid, uid, answer) {
	requireIdentity(bid, uid);
	const data = record(await requestBackend(bid, "post_players_id_captcha_state_verify", {
		path: { id: uid },
		body: { answer }
	}));
	if (typeof data.outcome !== "string" || ![
		"not_pending",
		"pending",
		"passed",
		"failed",
		"muted"
	].includes(data.outcome) || !nonNegativeInteger(data.failureCount) || !nonNegativeInteger(data.remainingAttempts) || !ttl(data.passedTtlSeconds) || !nonNegativeInteger(data.muteCount) || !ttl(data.muteTtlSeconds) || typeof data.muteUnlockTime !== "string") throw new Error("验证码校验响应不完整");
	return data;
}
async function claimBackendCaptchaOperation(bid, uid) {
	requireIdentity(bid, uid);
	const data = record(await requestBackend(bid, "post_players_id_captcha_state_operations_claim", { path: { id: uid } }));
	if (typeof data.checksDisabled !== "boolean" || typeof data.challengeRequired !== "boolean" || !nonNegativeInteger(data.operationCount) || !nonNegativeInteger(data.operationLimit) || !ttl(data.passedTtlSeconds)) throw new Error("验证码操作响应不完整");
	return data;
}
async function createBackendCaptchaChallenge(bid, uid) {
	requireIdentity(bid, uid);
	const data = record(await requestBackend(bid, "post_players_id_captcha_state_challenge", { path: { id: uid } }));
	if (typeof data.svg !== "string" || !data.svg.startsWith("<svg ") || !integer(data.captchaTtlSeconds) || data.captchaTtlSeconds <= 0) throw new Error("验证码挑战响应不完整");
	return data;
}
async function claimBackendCaptchaMuteReply(bid, uid) {
	requireIdentity(bid, uid);
	const data = record(await requestBackend(bid, "post_players_id_captcha_state_mute_reply_claim", { path: { id: uid } }));
	if (typeof data.muted !== "boolean" || typeof data.claimed !== "boolean" || !nonNegativeInteger(data.replyCount) || !ttl(data.muteTtlSeconds) || !ttl(data.replyTtlSeconds) || typeof data.muteUnlockTime !== "string") throw new Error("禁言回复响应不完整");
	return data;
}

//#endregion
export { claimBackendCaptchaMuteReply, claimBackendCaptchaOperation, createBackendCaptchaChallenge, verifyBackendCaptcha };