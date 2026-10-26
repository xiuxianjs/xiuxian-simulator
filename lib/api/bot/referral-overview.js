import { displayCurrencyText } from "../../constants/currency.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/referral-overview.ts
function record(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value, field, minimum = 0) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error(`邀请码${field}不完整`);
	return value;
}
function text(value, field) {
	if (typeof value !== "string") throw new Error(`邀请码${field}不完整`);
	return value;
}
function rulePanel(value) {
	const data = record(value, "邀请码规则页响应不完整");
	if (!Array.isArray(data.groups)) throw new Error("邀请码规则组响应不完整");
	return {
		pendingCount: integer(data.pendingCount, "待领取数量"),
		groups: data.groups.map((rawGroup) => {
			const group = record(rawGroup, "邀请码规则组响应不完整");
			if (!Array.isArray(group.rewards) || !group.rewards.every((reward) => typeof reward === "string")) throw new Error("邀请码奖励文本响应不完整");
			return {
				threshold: text(group.threshold, "门槛文本"),
				icon: text(group.icon, "状态图标"),
				tag: text(group.tag, "状态标签"),
				rewards: group.rewards.map(displayCurrencyText)
			};
		})
	};
}
/**
* Preserve the old overview-time materialization without letting its GET
* mutate state: first sync durable eligibility receipts, then read the panel.
*/
async function getBackendReferralOverview(bid, uid, request) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendReferralOverview(record(await requestBackend(bid, "post_players_id_referral_overview_sync", {
		path: { id: uid },
		...writeContext(request)
	}), "邀请码概览响应不完整"));
}
function parseBackendReferralOverview(value) {
	const data = record(value, "邀请码概览响应不完整");
	const panels = record(data.rulePanels, "邀请码规则页响应不完整");
	return {
		code: text(data.code, "邀请码"),
		inviteCount: integer(data.inviteCount, "邀请人数"),
		inviteLimit: data.inviteLimit === null ? null : integer(data.inviteLimit, "邀请人数上限", 1),
		pendingRewards: integer(data.pendingRewards, "待领取奖励数量"),
		rulePanels: {
			count: rulePanel(panels.count),
			vip_level: rulePanel(panels.vip_level),
			realm_level: rulePanel(panels.realm_level)
		}
	};
}

//#endregion
export { getBackendReferralOverview, parseBackendReferralOverview };