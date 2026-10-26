import { parsePlayerTalents, type PlayerTalents } from './talents';
import { parseSpiritRoot, type SpiritRootView } from './spirit-root';
import type { Schemas } from '../schemas';
import { BackendAPIError, requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendPlayerRegistration = Schemas['PlayerRead'];

export async function registerBackendPlayer(
  bid: string,
  input: { name: string; region?: string },
  request: BackendRequestContext
): Promise<BackendPlayerRegistration> {
  const result = (await requestBackend(bid, 'post_players', {
    body: { bid, name: input.name, ...(input.region ? { region: input.region } : {}) },
    ...writeContext(request)
  })) as BackendPlayerRegistration;

  if (!result || !Number.isSafeInteger(result.id) || result.id <= 0 || typeof result.name !== 'string' || !result.name) {
    throw new BackendAPIError('角色注册接口返回不完整', 'SDK_INVALID_RESPONSE', undefined, request.requestId);
  }

  return result;
}

export type BackendRegistrationResult =
  | { code: 'EXISTING_USER' | 'NEED_NAME' }
  | { code: 'NEED_GENDER'; data: { playerName: string } }
  | { code: 'OK'; data: { playerName: string; talents?: PlayerTalents; spiritRoot?: SpiritRootView } };

export function parseBackendRegistration(value: unknown): BackendRegistrationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('code' in value)) {
    throw new Error('角色注册响应不完整');
  }
  if (value.code === 'EXISTING_USER' || value.code === 'NEED_NAME') {
    return { code: value.code };
  }
  if (
    (value.code !== 'OK' && value.code !== 'NEED_GENDER') ||
    !('data' in value) ||
    !value.data ||
    typeof value.data !== 'object' ||
    Array.isArray(value.data) ||
    !('playerName' in value.data) ||
    typeof value.data.playerName !== 'string' ||
    !value.data.playerName
  ) {
    throw new Error('角色注册响应不完整');
  }

  if (value.code === 'NEED_GENDER') {
    return { code: 'NEED_GENDER', data: { playerName: value.data.playerName } };
  }

  return {
    code: 'OK',
    data: {
      playerName: value.data.playerName,
      ...('talents' in value.data ? { talents: parsePlayerTalents(value.data.talents) } : {}),
      ...('spiritRoot' in value.data ? { spiritRoot: parseSpiritRoot(value.data.spiritRoot) } : {})
    }
  };
}
