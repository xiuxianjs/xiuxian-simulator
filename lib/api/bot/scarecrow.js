import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/scarecrow.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("稻草人测试响应不完整");
	return value;
}
function integerField(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("稻草人测试响应不完整");
	return value;
}
function numberField(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("稻草人测试响应不完整");
	return value;
}
async function challengeBackendScarecrow(bid, uid, roundsText, request) {
	if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || roundsText !== void 0 && !/^\d+$/.test(roundsText)) throw new Error("稻草人测试参数无效");
	return parseBackendScarecrow(await requestBackend(bid, "post_players_id_scarecrow_challenge", {
		path: { id: uid },
		body: { ...roundsText === void 0 ? {} : { roundsText } },
		...writeContext(request)
	}));
}
function parseBackendScarecrow(value) {
	const data = row(value);
	const summary = row(data.summary);
	if (typeof data.logId !== "string" || !Array.isArray(summary.skills) || typeof summary.critRateText !== "string" || typeof summary.buffDamageShareText !== "string" || typeof summary.maxSingleDamageSkill !== "string") throw new Error("稻草人测试响应不完整");
	const skills = summary.skills.map((value) => {
		const skill = row(value);
		if (typeof skill.skillName !== "string" || typeof skill.damageShareText !== "string") throw new Error("稻草人测试响应不完整");
		return {
			skillName: skill.skillName,
			count: integerField(skill.count),
			totalDamage: integerField(skill.totalDamage),
			damageShareText: skill.damageShareText
		};
	});
	return {
		logId: data.logId,
		rounds: integerField(data.rounds),
		summary: {
			totalDamage: integerField(summary.totalDamage),
			skillDamage: integerField(summary.skillDamage),
			buffDamage: integerField(summary.buffDamage),
			skills,
			totalSkillAttacks: integerField(summary.totalSkillAttacks),
			critCount: integerField(summary.critCount),
			critRate: numberField(summary.critRate),
			critRateText: summary.critRateText,
			buffDamageShareText: summary.buffDamageShareText,
			maxSingleDamage: integerField(summary.maxSingleDamage),
			maxSingleDamageSkill: summary.maxSingleDamageSkill,
			maxSingleDamageRound: integerField(summary.maxSingleDamageRound)
		}
	};
}

//#endregion
export { challengeBackendScarecrow, parseBackendScarecrow };