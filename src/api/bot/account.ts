import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { Schemas } from '../schemas';
import { requireAccountResponse, validProfile, validPasswordResult, validEmailBegin, validEmailConfirm, validRoleSwitch } from './account-validation';

export type BackendProfile = Schemas['AuthProfile'];
export type BackendPasswordResult = Extract<Schemas['RobotPassword'], { updated: true }>;
export type BackendRoleSwitchResult = { fromUid: number; fromName: string; toUid: number; toName: string; cacheCleared: boolean };

export async function switchBackendRole(bid: string, targetPlayerId: number, request: BackendRequestContext): Promise<BackendRoleSwitchResult> {
  const data = await requestBackend(bid, 'post_auth_roles_switch', { body: { targetPlayerId }, ...writeContext(request) });

  requireAccountResponse(validRoleSwitch(data), request);

  return data;
}

export async function getBackendSecurityProfile(bid: string, request?: BackendRequestContext): Promise<BackendProfile> {
  const data = await requestBackend(bid, 'get_auth_profile', { requestId: request?.requestId });

  requireAccountResponse(validProfile(data), request);

  return data;
}

export async function setBackendPassword(bid: string, uid: number, password: string, request: BackendRequestContext): Promise<BackendPasswordResult> {
  const data = await requestBackend(bid, 'put_players_id_auth_password', { path: { id: uid }, body: { password }, ...writeContext(request) });

  return parseBackendPasswordResult(data, request);
}

export function parseBackendPasswordResult(value: unknown, request?: BackendRequestContext): BackendPasswordResult {
  requireAccountResponse(validPasswordResult(value), request);

  return value as BackendPasswordResult;
}
export async function beginBackendEmailVerification(
  bid: string,
  type: 'bind' | 'change' | 'changeEmail',
  value: string,
  request: BackendRequestContext
): Promise<Record<string, unknown>> {
  const data = await requestBackend(bid, 'post_auth_email_verifications', { body: { type, value }, ...writeContext(request) });

  requireAccountResponse(validEmailBegin(data, type), request);

  return data;
}

export async function confirmBackendEmailVerification(
  bid: string,
  type: 'bind' | 'change' | 'changeEmail',
  code: string,
  request: BackendRequestContext
): Promise<Record<string, unknown>> {
  const data = await requestBackend(bid, 'post_auth_email_verifications_type_confirm', { path: { type }, body: { code }, ...writeContext(request) });

  return parseBackendEmailConfirmation(data, type, request);
}

export function parseBackendEmailConfirmation(
  value: unknown,
  type: 'bind' | 'change' | 'changeEmail',
  request?: BackendRequestContext
): Record<string, unknown> {
  requireAccountResponse(validEmailConfirm(value, type), request);

  return value as Record<string, unknown>;
}

export async function issueBackendLoginWindow(bid: string, uid: number, request: BackendRequestContext) {
  return parseBackendLoginWindow(
    await requestBackend(bid, 'post_players_id_auth_temporary_password', { path: { id: uid }, requestId: request.requestId }),
    uid,
    request
  );
}

export type BackendLoginWindow = { playerId: number; email?: string; temporaryPassword: string; expiresAt: string; expiresIn: number };

export function parseBackendLoginWindow(value: unknown, uid: number, request?: BackendRequestContext): BackendLoginWindow {
  const data = value as BackendLoginWindow;

  requireAccountResponse(
    data !== null &&
      typeof data === 'object' &&
      data.playerId === uid &&
      (data.email === undefined || typeof data.email === 'string') &&
      typeof data.temporaryPassword === 'string' &&
      /^\d{8}$/.test(data.temporaryPassword) &&
      Number.isInteger(data.expiresIn) &&
      data.expiresIn > 0 &&
      typeof data.expiresAt === 'string' &&
      Number.isFinite(Date.parse(data.expiresAt)),
    request
  );

  return data;
}
