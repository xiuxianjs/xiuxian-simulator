//#region src/agent-play/reward-summary.ts
const labels = {
	get_checkin_status: "签到",
	get_task_panel: "任务",
	get_daily_activity: "日常活跃",
	get_weekly_activity: "周常活跃",
	get_achievement_overview: "成就",
	get_emails: "邮件"
};
/** Current-turn observations only; a returned page never proves global completion. */
function recordRewardObservation(states, action, value) {
	if (!labels[action]) return;
	const result = value;
	states.set(action, result?.ok === true && result.data !== void 0 && result.data !== null && result.data?.success !== false);
}
/** Correct explicit completeness claims, leaving receipts and exact input payloads alone. */
function qualifyRewardSummary(text, states) {
	const unavailable = [...states].filter(([, returned]) => !returned).map(([action]) => labels[action]);
	if (!unavailable.length) return text;
	return qualifyCompleteness(text, `${unavailable.join("、")}本轮尚未核对清楚，不能判断全部奖励是否领完`);
}
function qualifyCompleteness(text, caveat, settlement = false) {
	return text.split(/(\[\[[^\n]*?\]\]|```[\s\S]*?```)/gu).map((part, index) => {
		if (index % 2) return part;
		return part.split(/([。！？!?\n])/u).map((clause) => {
			if (/不能|不代表|不确定|无法|尚未|未能|不能确定/u.test(clause)) return clause;
			if (settlement && /(?:全部|全都|完整|整体)[^。！？\n]{0,8}成功|没有部分失败/u.test(clause)) return caveat;
			if (/没有其他(?:能领|可领|可领取)[^。！？\n]{0,8}奖励/u.test(clause)) return caveat;
			if (/(?:没有|没|无)遗漏(?:任何)?(?:可领取的)?(?:奖励|项目)|(?:奖励|项目)[^。！？\n]{0,12}(?:全部|全都|都已)[^。！？\n]{0,8}(?:领完|领光|领取完)/u.test(clause)) return caveat;
			return clause;
		}).join("");
	}).join("");
}
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
const positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const issued = (value) => Array.isArray(value) && value.some((item) => positive(record(item).amount));
const activityIssued = (value) => {
	const item = record(value);
	const maps = record(item.treasureMaps);
	return issued(item.issued) || maps.alreadyGranted === false && positive(maps.quantity);
};
/** Workflow completeness uses current eligibility, not the wording of the draft. */
function pendingActivityRewards(request, observations, results) {
	if (/签到|成就|邮件|宝箱|主线|月卡|日常|周常|活跃|(?:只|仅)(?:领|处理)|(?:不要|别)(?:领取|领)/u.test(request)) return [];
	if (!/(?:帮我|替我|给我)(?:领取|领)(?:奖励|补给)|(?:免费奖励|奖励).{0,8}(?:直接|立即)领取|(?:满足条件|符合条件).{0,20}(?:领取|领)/u.test(request)) return [];
	const attempted = new Set([...results].filter(([, value]) => record(record(value).error).outcome !== "not_started").map(([action]) => action));
	const pending = [];
	for (const period of ["daily", "weekly"]) {
		const action = `get_${period}_activity`;
		if (attempted.has(`claim_${period}_activity`) || attempted.has(`claim_all_${period}_activity`)) continue;
		const reply = record(observations.get(action));
		const envelope = record(reply.data);
		const result = record(envelope.result);
		if (reply.ok !== true || envelope.success !== true || envelope.branch !== "business") continue;
		if (result.taskRewardsCanClaim === true || Array.isArray(result.rewards) && result.rewards.some((item) => record(item).canClaim === true)) pending.push(action);
	}
	return pending;
}
/** Interpret already-decoded provider receipts, never infer settlement from eligibility. */
function rewardSettlement(results) {
	let attempted = false;
	let confirmed = false;
	let unresolved = false;
	let partial = false;
	for (const [action, value] of results) {
		if (!/^(?:claim_|checkin_)/u.test(action)) continue;
		attempted = true;
		const reply = record(value);
		const envelope = record(reply.data);
		if (reply.ok !== true || envelope.success !== true || envelope.branch !== "business") {
			unresolved = true;
			continue;
		}
		const result = record(envelope.result);
		if (action === "checkin_all" && Array.isArray(envelope.result)) {
			confirmed ||= envelope.result.some((item) => record(item).status === "done");
			partial ||= envelope.result.some((item) => record(item).status === "error");
		} else if (action === "claim_all_daily_activity" || action === "claim_all_weekly_activity") {
			confirmed ||= Array.isArray(result.claimed) && result.claimed.some(activityIssued) || issued(result.taskRewards);
			partial ||= result.partial === true || Boolean(result.error);
		} else if (action === "claim_all_achievements") confirmed ||= result.locked === false && positive(record(result.data).claimedCount);
		else if (action === "claim_storyline_chest" || action === "claim_storyline_chapter_chests") confirmed ||= result.success === true && Array.isArray(result.claimedIndexes) && result.claimedIndexes.length > 0 && positive(result.totalReward);
		else if (action === "claim_all_emails") confirmed ||= positive(result.claimed);
		else if (action === "claim_daily_activity" || action === "claim_weekly_activity") confirmed ||= activityIssued(result);
		else if (Array.isArray(result.issued)) confirmed ||= issued(result.issued);
		else unresolved = true;
	}
	return {
		attempted,
		confirmed,
		unresolved,
		partial
	};
}
/** Keep uncertain or empty settlement distinct from a request that never ran. */
function qualifyUnexecutedRewardClaim(text, results) {
	const settlement = rewardSettlement(results);
	if (settlement.confirmed) {
		if (!settlement.partial && !settlement.unresolved) return text;
		return qualifyCompleteness(text, "本轮只有部分领取结果得到确认，不能把其他项目说成全部成功", true);
	}
	if (!text.replace(/\[\[[^\n]*?\]\]|```[\s\S]*?```/gu, "").split(/[。！？!?\n]/u).some((clause) => !/没|未|不能|不代表|之前|上次|早已|已经领过|已领过|今日已签/u.test(clause) && /已(?:经)?(?:直接)?(?:领取成功|领到手|到账|领取并确认到账)|(?:这次|本次|本轮|刚才|刚刚|已直接)[^。！？\n]{0,30}(?:领到了?|领取了|领取成功|到账)|能领的都领了|我(?:就|来|帮你|只){0,3}领/u.test(clause))) return text;
	if (!settlement.attempted) return "本轮尚未执行领取。可领取不等于已到账，需要实际领取回执才能确认结果。";
	return settlement.unresolved || settlement.partial ? "本轮已尝试领取，但现有回执不能确认奖励到账。请先核对原结果，不要重复提交。" : "本轮领取回执没有显示新增奖励，不能把已领取、跳过或未解锁说成再次到账。";
}

//#endregion
export { pendingActivityRewards, qualifyRewardSummary, qualifyUnexecutedRewardClaim, recordRewardObservation, rewardSettlement };