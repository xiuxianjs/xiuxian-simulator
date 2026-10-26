import type { Schemas } from '../schemas';
import type { BackendRequestContext } from './context';
import { BackendAPIError, requestBackend } from './client';
import { getCurrentEvent } from 'alemonjs';

export type BackendRobotIdentity = Schemas['RobotIdentityView'];

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Diagnostic mapping only: this response never grants entry or write ownership. */
export function getBackendRobotIdentity(bid: string, request?: BackendRequestContext): Promise<BackendRobotIdentity> {
  const event = getCurrentEvent();

  return event?.UserId === bid ? getEventBackendRobotIdentity(event, request) : fetchBackendRobotIdentity(bid, request);
}

async function fetchBackendRobotIdentity(bid: string, request?: BackendRequestContext): Promise<BackendRobotIdentity> {
  const result = await requestBackend(bid, 'getRobotIdentity', { requestId: request?.requestId });
  const value: unknown = result;

  if (!record(value) || value.bid !== bid || !record(value.account)) {
    throw new BackendAPIError('身份接口返回不完整', 'SDK_INVALID_RESPONSE', undefined, request?.requestId);
  }
  const account = value.account;
  const validAccount =
    account.status === 'registered'
      ? typeof account.playerId === 'number' && Number.isSafeInteger(account.playerId) && account.playerId > 0
      : account.status === 'unregistered' && account.playerId === null;

  if (!validAccount) {
    throw new BackendAPIError('身份接口返回不完整', 'SDK_INVALID_RESPONSE', undefined, request?.requestId);
  }

  return result;
}

// Scope reuse to the actual event object, never to a player or a time window.
// Separate messages must observe fresh account mappings.
const eventIdentities = new WeakMap<object, { bid: string; identity: Promise<BackendRobotIdentity> }>();

export function getEventBackendRobotIdentity(event: object & { UserId?: string }, request?: BackendRequestContext): Promise<BackendRobotIdentity> {
  const bid = event.UserId;

  if (typeof bid !== 'string' || !bid.trim()) {
    return Promise.reject(new BackendAPIError('平台身份缺失', 'ROBOT_BID_INVALID'));
  }
  const cached = eventIdentities.get(event);

  if (cached?.bid === bid) {
    return cached.identity;
  }
  const identity = fetchBackendRobotIdentity(bid, request);

  eventIdentities.set(event, { bid, identity });

  return identity;
}

/** Registration or account switching invalidates even the current message. */
export function invalidateEventBackendRobotIdentity(event: object): void {
  eventIdentities.delete(event);
}

/** Seed from the authenticated aggregate endpoint; gameplay still checks ownership. */
export function seedEventBackendRobotIdentity(event: object & { UserId?: string }, identity: BackendRobotIdentity): void {
  if (identity.bid !== event.UserId) {
    throw new BackendAPIError('身份接口返回不完整', 'SDK_INVALID_RESPONSE');
  }
  eventIdentities.set(event, { bid: identity.bid, identity: Promise.resolve(identity) });
}
