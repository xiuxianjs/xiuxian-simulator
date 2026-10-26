import { parseReferralInvitees } from "./referral-invitees.js";
import { parseBackendReferralOverview } from "./referral-overview.js";

//#region src/api/bot/referral-robot-query.ts
function parseRobotReferralCode(value) {
	const overview = parseBackendReferralOverview(value);
	return {
		referralCode: overview.code,
		inviteCount: overview.inviteCount,
		inviteLimit: overview.inviteLimit,
		pendingRewards: overview.pendingRewards
	};
}
function referralRuleDecoder(kind) {
	return (value) => {
		const overview = parseBackendReferralOverview(value);
		return {
			inviteCount: overview.inviteCount,
			...overview.rulePanels[kind]
		};
	};
}
function referralInviteesArguments(text) {
	const match = text.trim().match(/^(?:!|！|\/|#|＃)?我的邀请(?:\s+(\d+))?$/);
	const page = match ? Number(match[1] ?? 1) : 0;
	return { page: Number.isSafeInteger(page) && page >= 1 ? page : null };
}
function referralInviteesDecoder(page) {
	return (value) => {
		if (page === null) throw new Error("邀请列表分页响应不完整");
		return parseReferralInvitees(value, page);
	};
}

//#endregion
export { parseRobotReferralCode, referralInviteesArguments, referralInviteesDecoder, referralRuleDecoder };