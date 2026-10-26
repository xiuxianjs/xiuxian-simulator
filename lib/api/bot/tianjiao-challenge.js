import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/tianjiao-challenge.ts
const row = (v) => {
	if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("登天挑战响应不完整");
	return v;
};
const integer = (v) => {
	if (typeof v !== "number" || !Number.isSafeInteger(v)) throw new Error("登天挑战响应不完整");
	return v;
};
const unit = (v) => {
	const x = row(v);
	const name = x.Name ?? x.name, isDead = x.Dead ?? x.IsDead ?? x.isDead;
	if (typeof name !== "string" || typeof isDead !== "boolean") throw new Error("登天挑战响应不完整");
	return {
		name,
		hp: integer(x.HP ?? x.hp),
		maxHp: integer(x.MaxHP ?? x.maxHp),
		isDead
	};
};
async function challengeBackendTianjiao(bid, uid, targetRank, request) {
	if (!bid || !Number.isSafeInteger(targetRank) || targetRank < 1) throw new Error("登天挑战参数无效");
	return parseTianjiaoChallenge(await requestBackend(bid, "post_players_id_tianjiao_challenges", {
		headers: repeatPresentationHeaders("登天挑战"),
		path: { id: uid },
		body: { targetRank },
		...writeContext(request)
	}));
}
function parseTianjiaoChallenge(value) {
	const d = row(value);
	if (typeof d.success !== "boolean" || typeof d.message !== "string" || typeof d.directOccupy !== "boolean" || typeof d.rewardText !== "string" || ![d.oldRank, d.newRank].every((rank) => rank === null || typeof rank === "number" && Number.isSafeInteger(rank)) || d.logId !== void 0 && typeof d.logId !== "string") throw new Error("登天挑战响应不完整");
	const result = {
		success: d.success,
		message: d.message,
		oldRank: d.oldRank === null ? null : integer(d.oldRank),
		newRank: d.newRank === null ? null : integer(d.newRank),
		directOccupy: d.directOccupy,
		rewardText: d.rewardText
	};
	if (typeof d.logId === "string") result.logId = d.logId;
	if (d.battle !== void 0 && d.battle !== null) {
		const b = row(d.battle);
		const a = b.SideA ?? b.sideA, c = b.SideB ?? b.sideB;
		if (!Array.isArray(a) || !Array.isArray(c)) throw new Error("登天挑战响应不完整");
		result.battle = {
			rounds: integer(b.Rounds ?? b.rounds),
			sideA: a.map(unit),
			sideB: c.map(unit)
		};
	}
	return result;
}

//#endregion
export { challengeBackendTianjiao, parseTianjiaoChallenge };