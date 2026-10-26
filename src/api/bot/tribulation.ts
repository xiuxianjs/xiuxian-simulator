import { parseDisruptionResult, parseParticipationResult } from '../schemas/public-tribulation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import {
  parseTribulationHeartDemon,
  parseTribulationPreparation,
  type TribulationHeartChoice,
  parseTribulationEvasionResult,
  parseTribulationReceipt,
  type TribulationInput
} from '../schemas/tribulation';

function identity(bid: string | undefined, uid: number, eventId: number): asserts bid is string {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(eventId) || eventId <= 0) {
    throw new Error('渡劫操作参数无效');
  }
}
export async function startBackendTribulation(bid: string | undefined, uid: number, eventId: number, input: TribulationInput, request?: BackendRequestContext) {
  identity(bid, uid, eventId);

  return parseTribulationReceipt(
    await requestBackend(bid, 'post_players_id_tribulation_events_eventId_start', { path: { id: uid, eventId }, body: input, ...writeContext(request) })
  );
}
export async function getBackendTribulationReceipt(bid: string | undefined, uid: number, eventId: number) {
  identity(bid, uid, eventId);

  return parseTribulationReceipt(await requestBackend(bid, 'get_players_id_tribulation_events_eventId_result', { path: { id: uid, eventId } }));
}

export async function disruptBackendTribulation(bid: string | undefined, uid: number, eventId: number, request?: BackendRequestContext) {
  identity(bid, uid, eventId);

  return parseDisruptionResult(
    await requestBackend(bid, 'post_players_id_tribulation_events_eventId_disrupt', { path: { id: uid, eventId }, ...writeContext(request) }),
    eventId
  );
}

export async function evadeBackendTribulation(bid: string | undefined, uid: number, eventId: number, request?: BackendRequestContext) {
  identity(bid, uid, eventId);

  return parseTribulationEvasionResult(
    await requestBackend(bid, 'post_players_id_tribulation_events_eventId_evade', { path: { id: uid, eventId }, ...writeContext(request) })
  );
}

export async function answerBackendTribulationHeartDemon(
  bid: string | undefined,
  uid: number,
  eventId: number,
  choice: TribulationHeartChoice,
  policyVersion: string,
  request?: BackendRequestContext
) {
  identity(bid, uid, eventId);

  return parseTribulationHeartDemon(
    await requestBackend(bid, 'post_players_id_tribulation_events_eventId_heart_demon', {
      path: { id: uid, eventId },
      body: { choice, policyVersion },
      ...writeContext(request)
    })
  );
}

export async function participateBackendTribulation(bid: string | undefined, uid: number, eventId: number, request?: BackendRequestContext) {
  identity(bid, uid, eventId);

  return parseParticipationResult(
    await requestBackend(bid, 'post_players_id_tribulation_events_eventId_participate', { path: { id: uid, eventId }, ...writeContext(request) }),
    eventId
  );
}

export async function openBackendTribulation(bid: string | undefined, uid: number, eventId: number, request?: BackendRequestContext) {
  identity(bid, uid, eventId);

  return parseTribulationPreparation(
    await requestBackend(bid, 'post_players_id_tribulation_events_eventId_open', { path: { id: uid, eventId }, ...writeContext(request) })
  );
}
