import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/referral-actions.ts
function record(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value, message, minimum = 0) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error(message);
	return value;
}
function issued(value, message) {
	return parsePositiveIssuedRewards(value, message).map(({ name, amount }) => ({
		name,
		amount
	}));
}
function referralBindFailureMessage(error) {
	if (!(error instanceof BackendAPIError)) return;
	if (error.message.includes("邀请码格式错误")) return "邀请码格式错误，请输入 tt-uid";
	if (error.message.includes("绑定邀请码已过期") || error.message.includes("仅可在注册30天内绑定")) return "仅可在注册30天内绑定邀请码";
	if (error.message.includes("已经绑定过")) return "你已经绑定过邀请码了";
	if (error.message.includes("不能绑定自己的")) return "不能绑定自己的邀请码";
	if (error.message.includes("邀请人不存在") || error.message.includes("邀请码对应的玩家不存在")) return "邀请码对应的玩家不存在";
	if (error.message.includes("邀请人数已达上限") || error.message.includes("邀请名额已满")) return "该邀请人的邀请名额已满，无法绑定";
	if (error.message.includes("玩家不存在")) return "玩家不存在";
}
function referralClaimFailureMessage(error) {
	if (!(error instanceof BackendAPIError)) return;
	if (error.message.includes("暂无可领取的邀请码奖励")) return "暂无可领取的奖励";
	if (error.message.includes("奖励配置已失效")) return "奖励配置已失效，无法领取";
	if (error.message.includes("旧奖励缺少可恢复快照") || error.message.includes("已达成奖励快照异常")) return error.message;
}
async function bindBackendReferralCode(bid, uid, code, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendReferralBind(record(await requestBackend(bid, "post_players_id_referral_bind", {
		path: { id: uid },
		body: { code },
		headers: repeatPresentationHeaders("绑定邀请码"),
		...writeContext(request)
	}), "绑定邀请码响应不完整"));
}
function parseBackendReferralBind(value) {
	return issued(record(value, "绑定邀请码响应不完整").issued, "绑定邀请码奖励响应不完整");
}
async function claimBackendReferralRewards(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendReferralClaim(record(await requestBackend(bid, "post_players_id_referral_claim", {
		path: { id: uid },
		headers: repeatPresentationHeaders("领取邀请奖励"),
		...writeContext(request)
	}), "领取邀请码奖励响应不完整"));
}
function parseBackendReferralClaim(value) {
	const result = record(value, "领取邀请码奖励响应不完整");
	return {
		claimed: integer(result.claimed, "领取邀请码奖励响应不完整", 1),
		issued: issued(result.issued, "领取邀请码奖励响应不完整")
	};
}

//#endregion
export { bindBackendReferralCode, claimBackendReferralRewards, parseBackendReferralBind, parseBackendReferralClaim, referralBindFailureMessage, referralClaimFailureMessage };