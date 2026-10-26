import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-competition-actions.ts
function parseCompetitionActionResult(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.message !== "string") throw new Error("宗门大比服务响应不完整");
	return value;
}
async function applyBackendGuildCompetition(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "post_players_id_guild_competition_apply", {
		headers: repeatPresentationHeaders("宗门大比报名"),
		path: { id: uid },
		...writeContext(request)
	}));
}
async function addBackendGuildCompetitionMember(bid, uid, targetUserId, position, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "post_players_id_guild_competition_team_members", {
		path: { id: uid },
		body: {
			targetUserId,
			position
		},
		...writeContext(request)
	}));
}
async function removeBackendGuildCompetitionMember(bid, uid, position, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "delete_players_id_guild_competition_team_members_position", {
		headers: repeatPresentationHeaders("移除宗门大比成员"),
		path: {
			id: uid,
			position
		},
		...writeContext(request)
	}));
}
async function adjustBackendGuildCompetitionMember(bid, uid, fromPosition, toPosition, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "post_players_id_guild_competition_team_position", {
		headers: repeatPresentationHeaders("调整宗门大比位置"),
		path: { id: uid },
		body: {
			fromPosition,
			toPosition
		},
		...writeContext(request)
	}));
}
async function clearBackendGuildCompetitionTeam(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "delete_players_id_guild_competition_team", {
		headers: repeatPresentationHeaders("宗门大比清队"),
		path: { id: uid },
		...writeContext(request)
	}));
}
async function betBackendGuildCompetition(bid, uid, guildId, amount, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "post_players_id_guild_competition_bets", {
		headers: repeatPresentationHeaders("押注宗门大比"),
		path: { id: uid },
		body: {
			guildId,
			amount
		},
		...writeContext(request)
	}));
}
async function followBetBackendGuildCompetition(bid, uid, amount, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "post_players_id_guild_competition_bets_follow", {
		headers: repeatPresentationHeaders("追投宗门大比"),
		path: { id: uid },
		body: { amount },
		...writeContext(request)
	}));
}
async function claimBackendGuildCompetitionRewards(bid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseCompetitionActionResult(await requestBackend(bid, "post_guild_competitions_current_rewards_claim", {
		headers: repeatPresentationHeaders("宗门大比领奖"),
		...writeContext(request)
	}));
}
async function challengeBackendGuildCompetition(bid, uid, defenderGuildId, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return await requestBackend(bid, "post_players_id_guild_competition_knockout_challenges", {
		headers: repeatPresentationHeaders("挑战宗门"),
		path: { id: uid },
		body: { defenderGuildId },
		...writeContext(request)
	});
}

//#endregion
export { addBackendGuildCompetitionMember, adjustBackendGuildCompetitionMember, applyBackendGuildCompetition, betBackendGuildCompetition, challengeBackendGuildCompetition, claimBackendGuildCompetitionRewards, clearBackendGuildCompetitionTeam, followBetBackendGuildCompetition, parseCompetitionActionResult, removeBackendGuildCompetitionMember };