import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendRealmBreakthrough = {
  newRealm: {
    name: string;
    level: number;
    spiritualPower: number;
    speed: number;
    magicAttack: number;
    physicalAttack: number;
    magicDefense: number;
    physicalDefense: number;
    experienceLimit: number;
  };
  message: string;
  unlockedRecipes: string[];
  isNewStage: boolean;
  newStageName: string;
  masterStageMessages: string[];
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('突破接口返回不完整，请更新服务端后重试');
  }

  return value as Record<string, unknown>;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export async function performBackendRealmBreakthrough(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<BackendRealmBreakthrough> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('突破操作参数无效');
  }
  const data = record(
    await requestBackend(bid, 'post_players_id_realm_breakthrough', { path: { id: uid }, headers: repeatPresentationHeaders('突破'), ...writeContext(request) })
  );

  return parseRealmBreakthrough(data);
}

export function parseRealmBreakthrough(value: unknown): BackendRealmBreakthrough {
  const data = record(value);
  const realm = record(data.newRealm);
  const unlockedRecipes = data.unlockedRecipes === undefined ? [] : data.unlockedRecipes;
  const newStageName = data.newStageName === undefined && data.isNewStage === false ? '' : data.newStageName;
  const numeric = ['level', 'spiritualPower', 'speed', 'magicAttack', 'physicalAttack', 'magicDefense', 'physicalDefense', 'experienceLimit'];

  if (
    typeof data.message !== 'string' ||
    typeof realm.name !== 'string' ||
    !numeric.every(key => finite(realm[key])) ||
    !Array.isArray(unlockedRecipes) ||
    !unlockedRecipes.every(value => typeof value === 'string') ||
    typeof data.isNewStage !== 'boolean' ||
    typeof newStageName !== 'string' ||
    !Array.isArray(data.masterStageMessages) ||
    !data.masterStageMessages.every(value => typeof value === 'string')
  ) {
    throw new Error('突破接口返回不完整，请更新服务端后重试');
  }

  return {
    newRealm: realm as BackendRealmBreakthrough['newRealm'],
    message: data.message,
    unlockedRecipes,
    isNewStage: data.isNewStage,
    newStageName,
    masterStageMessages: data.masterStageMessages
  };
}
