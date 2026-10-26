import { UNKNOWN_BATTLE_RESULT } from '../api/bot/battle-request';
import { SDKError } from '../api/core/error';

/** Only business rejections may expose backend text in a player reply. */
export function getCommandErrorMessage(error: unknown): string {
  if (
    error instanceof SDKError &&
    ['SDK_TIMEOUT', 'SDK_NETWORK_ERROR', 'SDK_ABORTED', 'SDK_INVALID_RESPONSE'].includes(error.code) &&
    error.message === UNKNOWN_BATTLE_RESULT
  ) {
    return UNKNOWN_BATTLE_RESULT;
  }
  // This known availability reason is safe player-facing text. Keep the
  // exact legacy 503 wording during backend/client deployment overlap.
  if (
    error instanceof SDKError &&
    error.status === 503 &&
    (error.code === 'TRIBULATION_EVENTS_DISABLED' || (error.code === 'SERVICE_UNAVAILABLE' && error.message === '新渡劫事件与观望尚未开放'))
  ) {
    return '新渡劫尚未开放，暂时无法查询劫云。';
  }

  return getCommandBusinessErrorMessage(error) ?? '服务暂时不可用，请稍后再试';
}

/** Undefined means the caller must keep its transport/internal error handling. */
export function getCommandBusinessErrorMessage(error: unknown): string | undefined {
  if (
    error instanceof SDKError &&
    [400, 403, 404, 409, 422].includes(error.status ?? 0) &&
    !error.code.startsWith('SDK_') &&
    !['INTERNAL', 'UNAUTHORIZED', 'UNAVAILABLE'].includes(error.code) &&
    error.message.trim()
  ) {
    return error.message;
  }

  return undefined;
}
