import { isRecord } from '../core/helpers';
import { BackendAPIError } from './client';
import type { BackendRequestContext } from './context';

export function requireAccountResponse(valid: boolean, request?: BackendRequestContext): asserts valid {
  if (!valid) {
    throw new BackendAPIError('账号接口返回不完整，请更新服务端后重试', 'SDK_INVALID_RESPONSE', undefined, request?.requestId);
  }
}

export function validProfile(data: unknown): boolean {
  return (
    isRecord(data) &&
    Number.isInteger(data.playerId) &&
    Number(data.playerId) > 0 &&
    typeof data.name === 'string' &&
    typeof data.email === 'string' &&
    typeof data.hasPassword === 'boolean' &&
    Number.isInteger(data.emailChangeCount) &&
    (data.previousEmail === null || typeof data.previousEmail === 'string')
  );
}

export function validPasswordResult(data: unknown): boolean {
  return (
    isRecord(data) &&
    data.updated === true &&
    Number.isInteger(data.playerId) &&
    Number(data.playerId) > 0 &&
    typeof data.bid === 'string' &&
    data.bid.length > 0 &&
    Number.isInteger(data.minLength) &&
    Number(data.minLength) > 0
  );
}

export function validEmailBegin(data: unknown, type: string): boolean {
  return (
    isRecord(data) &&
    data.type === type &&
    Number.isInteger(data.expiresIn) &&
    Number.isInteger(data.remainingToday) &&
    (data.targetName === undefined || typeof data.targetName === 'string')
  );
}

export function validEmailConfirm(data: unknown, type: string): boolean {
  if (!isRecord(data) || data.type !== type || data.verified !== true) {
    return false;
  }
  switch (type) {
    case 'bind':
      return typeof data.email === 'string';
    case 'changeEmail':
      return typeof data.oldEmail === 'string' && typeof data.newEmail === 'string';
    case 'change':
      return typeof data.fromName === 'string' && typeof data.toName === 'string';
    default:
      return false;
  }
}

export function validRoleSwitch(data: unknown): boolean {
  return (
    isRecord(data) &&
    Number.isInteger(data.fromUid) &&
    Number(data.fromUid) > 0 &&
    typeof data.fromName === 'string' &&
    Number.isInteger(data.toUid) &&
    Number(data.toUid) > 0 &&
    typeof data.toName === 'string' &&
    typeof data.cacheCleared === 'boolean'
  );
}
