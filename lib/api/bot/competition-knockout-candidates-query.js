import { requestBackend } from "./client.js";

//#region src/api/bot/competition-knockout-candidates-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门大比可挑战宗门接口数据不完整");
	return value;
}
function positiveInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function nonNegativeInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function integer(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
function parseBackendGuildCompetitionKnockoutCandidates(value) {
	const data = record(value);
	if (typeof data.competitionId !== "string" || !integer(data.score) || !nonNegativeInteger(data.remaining) || data.remaining > 10 || !Array.isArray(data.candidates) || data.candidates.length > 5) throw new Error("宗门大比可挑战宗门接口数据不完整");
	const candidates = data.candidates.map((value) => {
		const candidate = record(value);
		if (!positiveInteger(candidate.teamId) || !positiveInteger(candidate.guildId) || typeof candidate.guildName !== "string" || !integer(candidate.score) || !Array.isArray(candidate.slots) || candidate.slots.length !== 6) throw new Error("宗门大比可挑战宗门接口数据不完整");
		const slots = candidate.slots.map((value, index) => {
			if (value === null) return null;
			const slot = record(value);
			if (!positiveInteger(slot.position) || slot.position !== index + 1 || !positiveInteger(slot.userId) || typeof slot.name !== "string") throw new Error("宗门大比可挑战宗门席位数据不完整");
			return {
				position: slot.position,
				userId: slot.userId,
				name: slot.name
			};
		});
		return {
			teamId: candidate.teamId,
			guildId: candidate.guildId,
			guildName: candidate.guildName,
			score: candidate.score,
			slots
		};
	});
	return {
		competitionId: data.competitionId,
		score: data.score,
		remaining: data.remaining,
		candidates
	};
}
async function getBackendGuildCompetitionKnockoutCandidates(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendGuildCompetitionKnockoutCandidates(await requestBackend(bid, "get_players_id_guild_competition_knockout_candidates", { path: { id: uid } }));
}

//#endregion
export { getBackendGuildCompetitionKnockoutCandidates, parseBackendGuildCompetitionKnockoutCandidates };