//#region src/agent-play/growth-facts.ts
const record = (value) => {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
};
const nonnegative = (value) => {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
};
/** A conservative fallback from this turn's observations, never historical chat. */
function growthFacts(facts) {
	const data = (action) => {
		const result = record(facts.find((fact) => fact.action === action)?.result);
		return result.ok === true ? record(result.data) : {};
	};
	const profile = data("get_profile");
	const user = record(profile.user);
	const realm = record(profile.realm);
	const boostReply = data("get_meditation_boost_options");
	const boost = boostReply.success === true && boostReply.branch === "business" ? record(boostReply.result) : {};
	if (!profile.found || typeof realm.name !== "string" || !nonnegative(user.experience) || !nonnegative(realm.experienceLimit) || !nonnegative(user.mentalValue) || !nonnegative(boost.spiritStone)) return;
	const meditation = data("get_meditation_progress");
	const maxDurationHours = (meditation.success === true || meditation.reason === "not_started") && nonnegative(meditation.maxDurationMinutes) && meditation.maxDurationMinutes > 0 ? meditation.maxDurationMinutes / 60 : void 0;
	const gap = Math.max(0, realm.experienceLimit - user.experience);
	const lines = [
		`当前境界：${realm.name}；修为：${user.experience}/${realm.experienceLimit}；精力：${user.mentalValue}；灵石：${boost.spiritStone}。`,
		`距离当前修为门槛还差${gap}修为。这只对应当前境界，后续门槛需重新查询。`,
		gap > 0 ? "下一步先比较已开放主线的实际修为收益与精力消耗，再决定挑战或闭关；没有完整收益对比，不能断言哪条路线最快。" : "当前修为已达到门槛，下一步核对境界材料和资格，再决定是否突破。"
	];
	if (typeof boost.autoEnabled === "boolean" && nonnegative(boost.pricePerInterval) && nonnegative(boost.intervalMinutes) && boost.intervalMinutes > 0) lines.push(`闭关自动加速：${boost.autoEnabled ? "已开启" : "未开启"}；加速每${boost.intervalMinutes}分钟需${boost.pricePerInterval}灵石。开始修炼前应核对费用与设置。`);
	if (maxDurationHours !== void 0) lines.push(`单次闭关时长上限：${meditation.maxDurationMinutes}分钟，即${maxDurationHours}小时；这是单次上限，不是每日可获得修为的时长上限。具体收益仍以实际结算为准。`);
	lines.push("以上是当前资料支持的方案；这份说明不代表已经修炼、战斗、消费或领奖。");
	return {
		spiritStone: boost.spiritStone,
		maxDurationHours,
		text: lines.join("\n")
	};
}
function contradictsGrowthBalance(reply, facts) {
	return [...reply.matchAll(/灵石(?:余额)?(?:为|是|：|:)?\s*(\d+)|(?:现在|手上|余额)(?:只有|有|剩|为|是)?\s*(\d+)\s*灵石/gu)].some((match) => Number(match[1] ?? match[2]) !== facts.spiritStone);
}
/** Check explicit meditation caps, not a player's chosen shorter session. */
function contradictsGrowthDuration(reply, facts) {
	if (facts.maxDurationHours === void 0) return false;
	return reply.split(/[。！？\n]/u).filter((clause) => /闭关/u.test(clause)).some((clause) => {
		const caps = [...clause.matchAll(/(?:上限|封顶|最长|最多)(?:为|是|可|能|持续|达到|闭关|\s|：|:){0,6}(\d+(?:\.\d+)?)\s*(?:个)?小时/gu)].filter((match) => /闭关/u.test(clause.slice(0, match.index) + match[0]));
		return caps.some((match) => Number(match[1]) !== facts.maxDurationHours) || caps.length > 0 && /(?:每天|每日|一天|单日)[^，,；;]{0,20}(?:上限|封顶|最长|最多)/u.test(clause);
	});
}

//#endregion
export { contradictsGrowthBalance, contradictsGrowthDuration, growthFacts };