import type { PublicPlayerProfileQueryData } from '../schemas/public-player-profile-query';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('查看信息接口数据不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function profile(value: unknown): PublicPlayerProfileQueryData['profile'] {
  if (value === null) {
    return null;
  }
  const data = record(value);

  if (!integer(data.uid) || data.uid <= 0 || typeof data.name !== 'string' || typeof data.activeTitle !== 'string' || typeof data.realmName !== 'string') {
    throw new Error('查看信息资料数据不完整');
  }

  return { uid: data.uid, name: data.name, activeTitle: data.activeTitle, realmName: data.realmName };
}

function cave(value: unknown): NonNullable<PublicPlayerProfileQueryData['cave']> {
  const data = record(value);

  if (
    typeof data.relation !== 'string' ||
    !['self', 'companion', 'friend', 'stranger'].includes(data.relation) ||
    typeof data.relationLabel !== 'string' ||
    typeof data.canViewAura !== 'boolean' ||
    typeof data.blockedByFormation !== 'boolean' ||
    typeof data.auraText !== 'string' ||
    typeof data.summary !== 'string' ||
    (data.auraLevel !== undefined && typeof data.auraLevel !== 'string') ||
    (data.auraScore !== undefined && !integer(data.auraScore)) ||
    (data.activeFormationName !== undefined && typeof data.activeFormationName !== 'string')
  ) {
    throw new Error('查看信息洞府数据不完整');
  }

  return {
    relation: data.relation as NonNullable<PublicPlayerProfileQueryData['cave']>['relation'],
    relationLabel: data.relationLabel,
    canViewAura: data.canViewAura,
    blockedByFormation: data.blockedByFormation,
    auraText: data.auraText,
    summary: data.summary,
    ...(typeof data.auraLevel === 'string' ? { auraLevel: data.auraLevel } : {}),
    ...(integer(data.auraScore) ? { auraScore: data.auraScore } : {}),
    ...(typeof data.activeFormationName === 'string' ? { activeFormationName: data.activeFormationName } : {})
  };
}

function detail(value: unknown): NonNullable<PublicPlayerProfileQueryData['detail']> {
  const data = record(value);

  if (!['strength', 'intelligence', 'constitution', 'agility', 'luck'].every(key => integer(data[key]))) {
    throw new Error('查看信息五维数据不完整');
  }
  const battle = record(data.battle);

  if (!['physicalAttack', 'physicalDefense', 'magicAttack', 'magicDefense', 'hp', 'speed', 'critRate', 'critDamage'].every(key => integer(battle[key]))) {
    throw new Error('查看信息战斗属性不完整');
  }

  return {
    strength: data.strength as number,
    intelligence: data.intelligence as number,
    constitution: data.constitution as number,
    agility: data.agility as number,
    luck: data.luck as number,
    battle: {
      physicalAttack: battle.physicalAttack as number,
      physicalDefense: battle.physicalDefense as number,
      magicAttack: battle.magicAttack as number,
      magicDefense: battle.magicDefense as number,
      hp: battle.hp as number,
      speed: battle.speed as number,
      critRate: battle.critRate as number,
      critDamage: battle.critDamage as number
    }
  };
}

export function parseBackendPublicPlayerProfile(value: unknown): PublicPlayerProfileQueryData {
  const data = record(value);

  if (typeof data.found !== 'boolean' || typeof data.hideProfile !== 'boolean') {
    throw new Error('查看信息接口数据不完整');
  }
  const parsedProfile = profile(data.profile);

  if (!data.found) {
    if (parsedProfile !== null || data.cave !== undefined || data.detail !== undefined) {
      throw new Error('查看信息不存在资料不完整');
    }

    return { found: false, hideProfile: data.hideProfile, profile: null };
  }
  if (
    parsedProfile === null ||
    data.cave === undefined ||
    (data.hideProfile && data.detail !== undefined) ||
    (!data.hideProfile && data.detail === undefined)
  ) {
    throw new Error('查看信息接口数据不完整');
  }

  return {
    found: true,
    hideProfile: data.hideProfile,
    profile: parsedProfile,
    cave: cave(data.cave),
    ...(data.hideProfile ? {} : { detail: detail(data.detail) })
  };
}

export async function getBackendPublicPlayerProfile(bid: string | undefined, viewerUid: number, targetUid: number): Promise<PublicPlayerProfileQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendPublicPlayerProfile(await requestBackend(bid, 'get_players_id_public_profile_targetId', { path: { id: viewerUid, targetId: targetUid } }));
}
