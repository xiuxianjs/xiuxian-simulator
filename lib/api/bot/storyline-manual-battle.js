import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/storyline-manual-battle.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("主线手动战斗响应不完整");
	return value;
}
function parseStorylineManualBattleState(value) {
	const data = record(value);
	const events = data.events === null ? [] : data.events;
	if (typeof data.sessionId !== "string" || typeof data.finished !== "boolean" || !Array.isArray(events)) throw new Error("主线手动战斗响应不完整");
	let choice;
	if (data.choice !== void 0 && data.choice !== null) {
		const raw = record(data.choice);
		if (typeof raw.unitId !== "string" || typeof raw.unitName !== "string" || raw.side !== "A" && raw.side !== "B" || !Number.isInteger(raw.round) || !Array.isArray(raw.availableSkills)) throw new Error("主线手动战斗选技数据不完整");
		choice = {
			unitId: raw.unitId,
			unitName: raw.unitName,
			side: raw.side,
			round: raw.round,
			availableSkills: raw.availableSkills.map((value) => {
				const skill = record(value);
				if (typeof skill.type !== "string" || ![
					"normal",
					"battle",
					"divine"
				].includes(skill.type) || typeof skill.name !== "string" || typeof skill.available !== "boolean") throw new Error("主线手动战斗技能数据不完整");
				return {
					type: skill.type,
					name: skill.name,
					available: skill.available,
					...typeof skill.reason === "string" ? { reason: skill.reason } : {}
				};
			})
		};
	}
	return {
		sessionId: data.sessionId,
		choice,
		finished: data.finished,
		...typeof data.winner === "string" ? { winner: data.winner } : {},
		events,
		...typeof data.logId === "string" ? { logId: data.logId } : {},
		...data.settlement !== void 0 ? { settlement: data.settlement } : {}
	};
}
async function submitBackendStorylineManualChoice(bid, uid, sessionId, choice, request) {
	if (!sessionId || !choice) throw new Error("主线战斗选技参数无效");
	return parseStorylineManualBattleState(await requestBackend(bid, "post_players_id_storyline_manual_battles_sessionId_choices", {
		path: {
			id: uid,
			sessionId
		},
		body: { choice },
		...writeContext(request)
	}));
}
async function readBackendStorylineManualBattle(bid, uid, sessionId) {
	if (!sessionId) throw new Error("主线战斗会话参数无效");
	return parseStorylineManualBattleState(await requestBackend(bid, "get_players_id_storyline_manual_battles_sessionId", { path: {
		id: uid,
		sessionId
	} }));
}
async function startBackendStorylineChallenge(bid, uid, chapterNumber, stageNumber, request) {
	return parseStorylineManualBattleState(await requestBackend(bid, "post_players_id_storyline_challenge_command", {
		path: { id: uid },
		body: {
			chapterNumber,
			stageNumber
		},
		...writeContext(request)
	}));
}
function parseStorylineChallengeBusiness(value) {
	if (record(value).outcome === "ignored") return { ignored: true };
	return {
		ignored: false,
		state: parseStorylineManualBattleState(value)
	};
}

//#endregion
export { parseStorylineChallengeBusiness, parseStorylineManualBattleState, readBackendStorylineManualBattle, startBackendStorylineChallenge, submitBackendStorylineManualChoice };