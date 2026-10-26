import { parseRecoveryEffects } from '../schemas/resource-recovery';
import type { EquipmentDetailQueryData } from '../schemas/equipment-detail-query';
import { requestBackend } from './client';

const integerStatFields = ['physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'speed'] as const;
const statFields = [
  'physicalAttackPercent',
  'magicAttackPercent',
  'physicalDefensePercent',
  'magicDefensePercent',
  'hpPercent',
  'critRate',
  'critDamage',
  'antiCritRate',
  'hitRate',
  'dodgeRate'
] as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('装备详情接口数据不完整');
  }

  return value as Record<string, unknown>;
}
export async function getBackendEquipmentDetail(bid: string | undefined, uid: number, typeName: string): Promise<EquipmentDetailQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_equipment_detail', { path: { id: uid }, query: { typeName } });

  return parseBackendEquipmentDetail(data);
}

export function parseBackendEquipmentDetail(value: unknown): EquipmentDetailQueryData {
  const data = record(value);

  if (data.playerName !== null && typeof data.playerName !== 'string') {
    throw new Error('装备详情接口数据不完整');
  }
  if (data.item !== null) {
    const row = record(data.item);

    row.recoveryEffects = parseRecoveryEffects(row.recoveryEffects);

    if (
      !Number.isSafeInteger(row.id) ||
      Number(row.id) < 1 ||
      !Number.isSafeInteger(row.isLocked) ||
      typeof row.name !== 'string' ||
      (row.crafterName !== undefined && row.crafterName !== null && typeof row.crafterName !== 'string') ||
      (row.gradeName !== null && typeof row.gradeName !== 'string') ||
      !integerStatFields.every(key => Number.isSafeInteger(row[key])) ||
      !statFields.every(key => typeof row[key] === 'number' && Number.isFinite(row[key]))
    ) {
      throw new Error('装备详情接口数据不完整');
    }
  }

  return data as unknown as EquipmentDetailQueryData;
}

export function parseRobotEquipmentDetail(value: unknown) {
  const out = parseBackendEquipmentDetail(value);

  if (!out.item) {
    throw new Error('装备详情接口数据不完整');
  }

  return {
    playerName: out.playerName === '' ? '未知玩家' : (out.playerName ?? '未知玩家'),
    item: { ...out.item, equipment: { name: out.item.name, grade: { name: out.item.gradeName } } }
  };
}
