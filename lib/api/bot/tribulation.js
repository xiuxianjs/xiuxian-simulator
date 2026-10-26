import { requestBackend, writeContext } from "./client.js";
import { parseDisruptionResult, parseParticipationResult } from "../schemas/public-tribulation.js";
import { parseTribulationEvasionResult, parseTribulationHeartDemon, parseTribulationPreparation, parseTribulationReceipt } from "../schemas/tribulation.js";

//#region src/api/bot/tribulation.ts
function identity(bid, uid, eventId) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(eventId) || eventId <= 0) throw new Error("渡劫操作参数无效");
}
async function startBackendTribulation(bid, uid, eventId, input, request) {
	identity(bid, uid, eventId);
	return parseTribulationReceipt(await requestBackend(bid, "post_players_id_tribulation_events_eventId_start", {
		path: {
			id: uid,
			eventId
		},
		body: input,
		...writeContext(request)
	}));
}
async function getBackendTribulationReceipt(bid, uid, eventId) {
	identity(bid, uid, eventId);
	return parseTribulationReceipt(await requestBackend(bid, "get_players_id_tribulation_events_eventId_result", { path: {
		id: uid,
		eventId
	} }));
}
async function disruptBackendTribulation(bid, uid, eventId, request) {
	identity(bid, uid, eventId);
	return parseDisruptionResult(await requestBackend(bid, "post_players_id_tribulation_events_eventId_disrupt", {
		path: {
			id: uid,
			eventId
		},
		...writeContext(request)
	}), eventId);
}
async function evadeBackendTribulation(bid, uid, eventId, request) {
	identity(bid, uid, eventId);
	return parseTribulationEvasionResult(await requestBackend(bid, "post_players_id_tribulation_events_eventId_evade", {
		path: {
			id: uid,
			eventId
		},
		...writeContext(request)
	}));
}
async function answerBackendTribulationHeartDemon(bid, uid, eventId, choice, policyVersion, request) {
	identity(bid, uid, eventId);
	return parseTribulationHeartDemon(await requestBackend(bid, "post_players_id_tribulation_events_eventId_heart_demon", {
		path: {
			id: uid,
			eventId
		},
		body: {
			choice,
			policyVersion
		},
		...writeContext(request)
	}));
}
async function participateBackendTribulation(bid, uid, eventId, request) {
	identity(bid, uid, eventId);
	return parseParticipationResult(await requestBackend(bid, "post_players_id_tribulation_events_eventId_participate", {
		path: {
			id: uid,
			eventId
		},
		...writeContext(request)
	}), eventId);
}
async function openBackendTribulation(bid, uid, eventId, request) {
	identity(bid, uid, eventId);
	return parseTribulationPreparation(await requestBackend(bid, "post_players_id_tribulation_events_eventId_open", {
		path: {
			id: uid,
			eventId
		},
		...writeContext(request)
	}));
}

//#endregion
export { answerBackendTribulationHeartDemon, disruptBackendTribulation, evadeBackendTribulation, getBackendTribulationReceipt, openBackendTribulation, participateBackendTribulation, startBackendTribulation };