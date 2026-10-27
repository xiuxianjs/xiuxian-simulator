import { parseRecoverySummary, type ResourceRecoverySummary } from '../schemas/resource-recovery';
import { requestBackend } from './client';

export type BackendAttributePanel = {
  mpRecoveryEfficiency?: number;
  mentalRecoveryEfficiency?: number;
  resourceRecovery?: ResourceRecoverySummary;
  daoName: string;
  uid: number;
  realmName: string;
  maxAttributeBonus: number;
  strength: number;
  maxStrength: number;
  intelligence: number;
  maxIntelligence: number;
  constitution: number;
  maxConstitution: number;
  agility: number;
  maxAgility: number;
  luck: number;
  maxLuck: number;
  combatPower: number;
  physicalAttack: number;
  physicalDefense: number;
  magicAttack: number;
  magicDefense: number;
  spiritualPower: number;
  mentalPower: number;
  hp: number;
  speed: number;
  critRate: number;
  critDamage: number;
  antiCritRate: number;
  hitRate: number;
  dodgeRate: number;
  theme: Record<string, unknown> | null;
  access: { canUseMeridian: boolean; canUseSoulArtifact: boolean; canUseSoulPath: boolean };
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('属性面板响应不完整');
  }

  return value as Record<string, unknown>;
}

function numberField(data: Record<string, unknown>, key: string, minimum = 0): number {
  const value = data[key];

  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new Error(`属性面板响应字段无效: ${key}`);
  }

  return value;
}

function integerField(data: Record<string, unknown>, key: string): number {
  const value = numberField(data, key, Number.MIN_SAFE_INTEGER);

  if (!Number.isSafeInteger(value)) {
    throw new Error(`属性面板响应字段无效: ${key}`);
  }

  return value;
}

export async function getBackendAttributePanel(bid: string | undefined, uid: number, signal?: AbortSignal): Promise<BackendAttributePanel> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('属性面板查询参数无效');
  }

  return parseAttributePanel(await requestBackend(bid, 'get_players_id_attribute_panel', { path: { id: uid }, signal }), uid);
}

export function parseAttributePanel(value: unknown, uid: number): BackendAttributePanel {
  const data = record(value);
  const access = record(data.access);

  if (
    typeof data.daoName !== 'string' ||
    typeof data.realmName !== 'string' ||
    !Number.isSafeInteger(data.uid) ||
    data.uid !== uid ||
    (data.theme !== null && (typeof data.theme !== 'object' || Array.isArray(data.theme))) ||
    typeof access.canUseMeridian !== 'boolean' ||
    typeof access.canUseSoulArtifact !== 'boolean' ||
    typeof access.canUseSoulPath !== 'boolean'
  ) {
    throw new Error('属性面板响应不完整');
  }
  const output: BackendAttributePanel = {
    daoName: data.daoName,
    uid,
    realmName: data.realmName,
    theme: data.theme === null ? null : record(data.theme),
    access: { canUseMeridian: access.canUseMeridian, canUseSoulArtifact: access.canUseSoulArtifact, canUseSoulPath: access.canUseSoulPath },
    maxAttributeBonus: integerField(data, 'maxAttributeBonus'),
    strength: integerField(data, 'strength'),
    maxStrength: integerField(data, 'maxStrength'),
    intelligence: integerField(data, 'intelligence'),
    maxIntelligence: integerField(data, 'maxIntelligence'),
    constitution: integerField(data, 'constitution'),
    maxConstitution: integerField(data, 'maxConstitution'),
    agility: integerField(data, 'agility'),
    maxAgility: integerField(data, 'maxAgility'),
    luck: integerField(data, 'luck'),
    maxLuck: integerField(data, 'maxLuck'),
    combatPower: integerField(data, 'combatPower'),
    physicalAttack: integerField(data, 'physicalAttack'),
    physicalDefense: integerField(data, 'physicalDefense'),
    magicAttack: integerField(data, 'magicAttack'),
    magicDefense: integerField(data, 'magicDefense'),
    spiritualPower: integerField(data, 'spiritualPower'),
    mentalPower: integerField(data, 'mentalPower'),
    hp: integerField(data, 'hp'),
    speed: integerField(data, 'speed'),
    critRate: integerField(data, 'critRate'),
    critDamage: integerField(data, 'critDamage'),
    antiCritRate: integerField(data, 'antiCritRate'),
    hitRate: integerField(data, 'hitRate'),
    dodgeRate: integerField(data, 'dodgeRate')
  };

  output.resourceRecovery = parseRecoverySummary(data.resourceRecovery);
  for (const key of ['mpRecoveryEfficiency', 'mentalRecoveryEfficiency'] as const) {
    if (data[key] !== undefined) {
      output[key] = numberField(data, key);
    }
  }

  return output;
}
