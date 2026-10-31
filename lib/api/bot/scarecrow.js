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
function damageField(value, exact) {
	if (exact !== void 0) {
		if (typeof exact !== "string" || !/^(0|[1-9]\d*)$/.test(exact)) throw new Error("稻草人测试响应不完整");
		const parsed = BigInt(exact);
		return parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(parsed) : parsed;
	}
	return integerField(value);
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
			totalDamage: damageField(skill.totalDamage, skill.totalDamageText),
			damageShareText: skill.damageShareText
		};
	});
	return {
		logId: data.logId,
		rounds: integerField(data.rounds),
		summary: {
			totalDamage: damageField(summary.totalDamage, summary.totalDamageText),
			skillDamage: damageField(summary.skillDamage, summary.skillDamageText),
			buffDamage: damageField(summary.buffDamage, summary.buffDamageText),
			skills,
			totalSkillAttacks: integerField(summary.totalSkillAttacks),
			critCount: integerField(summary.critCount),
			critRate: numberField(summary.critRate),
			critRateText: summary.critRateText,
			buffDamageShareText: summary.buffDamageShareText,
			maxSingleDamage: damageField(summary.maxSingleDamage, summary.maxSingleDamageText),
			maxSingleDamageSkill: summary.maxSingleDamageSkill,
			maxSingleDamageRound: integerField(summary.maxSingleDamageRound)
		}
	};
}

//#endregion
export { challengeBackendScarecrow, parseBackendScarecrow };