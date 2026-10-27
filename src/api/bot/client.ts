import { getCurrentEvent, logger } from 'alemonjs';
import { getCommandErrorMessage } from '../../utils/commandError';
import { isDetailedTimingEvent, measureTransportStageSync, recordTransportStage, transportEventOffset } from '../../utils/transportTiming';
import { createClient, SDKError, type RequestArguments } from '../core';
import { isParameterRecord } from '../core/helpers';
import { operationDefinitions, type OperationId, type Operations } from '../registry';
import { invalidateEventAccessFacts } from './access-facts';
import { backendRequestTimeout, backendTransportOperation, isBattleOperation, UNKNOWN_BATTLE_RESULT } from './battle-request';
import { assertChannelRobotEvent, getBackendConfig } from './config';
import { backendConnectionPools } from './connection-pools';
import type { BackendRequestContext } from './context';
import { createBackendRequestContext, getEventTransportDiagnosticContext } from './context';
import { receiveRepeatPresentation } from './repeat-presentation';
import { normalizeRobotBid } from './robot-bid';

// Event-local diagnostics only; never cache identities, replies or write results.
const eventRequestTimings = new WeakMap<object, { sequence: number; active: number; totalMs: number; startedAt: number }>();

export class BackendAPIError extends SDKError {
  constructor(message: string, code = 'SDK_ERROR', status?: number, requestId?: string, details?: unknown) {
    super(message, { code, status, requestId, details });
    this.name = 'BackendAPIError';
  }
}

export function writeContext(request?: BackendRequestContext): { requestId: string; idempotencyKey: string } {
  if (!request?.idempotencyKey) {
    throw new Error('当前平台消息缺少唯一标识，无法安全提交写操作');
  }

  return { requestId: request.requestId, idempotencyKey: request.idempotencyKey };
}

// Some conditional state updates need the platform message identity for
// auditing, but deliberately do not use HTTP replay semantics.
export function writeTraceContext(request?: BackendRequestContext): { requestId: string } {
  if (!request?.idempotencyKey) {
    throw new Error('当前平台消息缺少唯一标识，无法安全提交写操作');
  }

  return { requestId: request.requestId };
}

export async function requestBackend<I extends OperationId>(bid: unknown, operationId: I, ...args: RequestArguments<I>): Promise<Operations[I]['response']> {
  const config = getBackendConfig();

  if (!config.url || !config.robotAuthToken) {
    throw new Error('后端 API 未配置');
  }
  const transportOperation = backendTransportOperation(operationId, args[0]);
  const startedAt = performance.now();
  let outcome = 'error';
  const event = getCurrentEvent();

  if (event) {
    assertChannelRobotEvent(event);
  }

  if (event && operationDefinitions[operationId].method !== 'GET') {
    invalidateEventAccessFacts(event);
  }
  const actorPath = args[0]?.path;
  const actorUid =
    actorPath && 'id' in actorPath ? actorPath.id : actorPath && 'playerId' in actorPath ? actorPath.playerId : event && 'uid' in event ? event.uid : undefined;
  const requestId = args[0]?.requestId ?? (event ? createBackendRequestContext(event).requestId : undefined);
  const tracedArgs = requestId && (args[0] === undefined || isParameterRecord(args[0])) ? ([{ ...args[0], requestId }] as RequestArguments<I>) : args;

  const eventTiming = event ? (eventRequestTimings.get(event) ?? { sequence: 0, active: 0, totalMs: 0, startedAt }) : undefined;
  const requestSequence = eventTiming ? ++eventTiming.sequence : undefined;
  const concurrentRequestsAtStart = eventTiming ? ++eventTiming.active : undefined;

  if (event && eventTiming) {
    eventRequestTimings.set(event, eventTiming);
  }

  try {
    const normalizedBid = normalizeRobotBid(bid);
    const timeoutMs = backendRequestTimeout(transportOperation, config.timeoutMs);
    let timedArgs = tracedArgs;

    if (operationId === 'post_robot_command_entry' && new Headers(tracedArgs[0]?.headers).get('X-Command-Catalog') === 'v1') {
      const headers = new Headers(tracedArgs[0]?.headers);

      headers.set('X-Command-Catalog-Timeout-Ms', String(timeoutMs));
      timedArgs = [{ ...tracedArgs[0], headers }] as RequestArguments<I>;
    }
    const buildClient = () => createClient({
        baseUrl: config.url,
        onTiming: isDetailedTimingEvent(event) ? (stage, start, end, outcome) => recordTransportStage(stage, start, end, outcome, event) : undefined,
        connectionPools: backendConnectionPools,
        onPresentation: value => receiveRepeatPresentation(event, normalizedBid, actorUid, value),
        identity: { kind: 'robot', token: config.robotAuthToken, bid: normalizedBid },
        timeoutMs
      });
    const client = isDetailedTimingEvent(event) ? measureTransportStageSync('api.client.create', buildClient, event) : buildClient();

    const result = await client.request(operationId, ...timedArgs);

    outcome = 'success';

    return result;
  } catch (error) {
    if (error instanceof SDKError) {
      if (error.code === 'SDK_ROBOT_BID_INVALID') {
        logger.warn('机器人请求缺少有效玩家标识', {
          operationId,
          platform: event?.Platform,
          event: event?.name,
          userIdType: typeof bid,
          userIdLength: typeof bid === 'string' ? bid.length : undefined,
          missing: bid === undefined || bid === null || bid === '',
          hasWhitespace: typeof bid === 'string' && bid.trim() !== bid,
          hasComma: typeof bid === 'string' && bid.includes(','),
          hasNonASCII: typeof bid === 'string' && /[^\x20-\x7e]/.test(bid)
        });
      }
      const message =
        isBattleOperation(transportOperation) && ['SDK_TIMEOUT', 'SDK_NETWORK_ERROR', 'SDK_ABORTED', 'SDK_INVALID_RESPONSE'].includes(error.code)
          ? UNKNOWN_BATTLE_RESULT
          : isBattleOperation(transportOperation)
            ? getCommandErrorMessage(error)
            : error.message;

      throw new BackendAPIError(message, error.code, error.status, error.requestId, error.details);
    }
    throw error;
  } finally {
    // An interim bubble may have read access while this request was in flight.
    // After completion, the next send must observe the committed game state.
    if (event && operationDefinitions[operationId].method !== 'GET') {
      invalidateEventAccessFacts(event);
    }
    const finishedAt = performance.now();
    const durationMs = Number((finishedAt - startedAt).toFixed(3));

    if (eventTiming) {
      eventTiming.active--;
      eventTiming.totalMs += durationMs;
    }

    try {
      if (config.logApiTimings) {
        logger.info('[后端请求耗时]', {
          operationId,
          requestId,
          ...getEventTransportDiagnosticContext(event),
          durationMs,
          outcome,
          requestSequence,
          concurrentRequestsAtStart,
          // Sum of call durations, including overlaps; not command wall time.
          cumulativeRequestMs: eventTiming?.totalMs,
          startedFromEventStartMs: transportEventOffset(event, startedAt),
          elapsedFromEventStartMs: transportEventOffset(event, finishedAt),
          elapsedFromFirstRequestMs: eventTiming ? Math.round(finishedAt - eventTiming.startedAt) : undefined
        });
      }
    } catch {
      // Diagnostics must never replace a committed result or the original error.
    }
  }
}
