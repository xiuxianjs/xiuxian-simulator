import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendEquipmentEquipResult = {
  outcome: 'equipped' | 'not_found' | 'not_found_or_equipped' | 'life_equipment' | 'realm_insufficient';
  equipment?: BackendEquipmentView;
};

export type BackendEquipmentView = {
  id: number;
  name: string;
  equipmentType: string;
  grade: string;
  physicalAttack: number;
  physicalAttackPercent: number;
  magicAttack: number;
  magicAttackPercent: number;
  physicalDefense: number;
  physicalDefensePercent: number;
  magicDefense: number;
  magicDefensePercent?: number;
  hp: number;
  hpPercent: number;
  speed: number;
  critRate: number;
  critDamage: number;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('装备接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('装备接口数值无效');
  }

  return value;
}

function equipment(value: unknown): BackendEquipmentView {
  const row = record(value);

  if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id < 1) {
    throw new Error('装备接口数值无效');
  }
  const strings = ['name', 'equipmentType', 'grade'];

  for (const key of strings) {
    if (typeof row[key] !== 'string') {
      throw new Error('装备接口展示字段无效');
    }
  }
  const numbers = [
    'physicalAttack',
    'physicalAttackPercent',
    'magicAttack',
    'magicAttackPercent',
    'physicalDefense',
    'physicalDefensePercent',
    'magicDefense',
    'hp',
    'hpPercent',
    'speed',
    'critRate',
    'critDamage'
  ];

  for (const key of numbers) {
    finite(row[key]);
  }
  if (row.magicDefensePercent !== undefined) {
    finite(row.magicDefensePercent);
  }

  return row as BackendEquipmentView;
}

export async function equipBackendEquipment(
  bid: string | undefined,
  uid: number,
  identifier: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendEquipmentEquipResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_equipment_equip', {
    path: { id: uid },
    body: { identifier },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseBackendEquipmentEquip(data);
}

export function parseBackendEquipmentEquip(value: unknown): BackendEquipmentEquipResult {
  const data = record(value);

  if (typeof data.outcome !== 'string' || !['equipped', 'not_found', 'not_found_or_equipped', 'life_equipment', 'realm_insufficient'].includes(data.outcome)) {
    throw new Error('装备接口结果无效');
  }
  if (data.outcome === 'equipped') {
    return { outcome: 'equipped', equipment: equipment(data.equipment) };
  }
  if (data.equipment !== undefined) {
    throw new Error('装备失败响应不应包含装备');
  }

  return { outcome: data.outcome as BackendEquipmentEquipResult['outcome'] };
}

export function parseEquipCommand(messageText: string): string | null {
  const match = messageText.trim().match(/^(!|！|\/|#|＃)?装备\s+(.+)$/);

  return match?.[2]?.trim() ?? null;
}

export function parseRobotEquipmentEquip(value: unknown): {
  message: string;
  equipment: BackendEquipmentView & {
    equipment: { name: string; grade: { name: string }; equipmentType: { name: string } };
  };
} {
  const result = parseBackendEquipmentEquip(value);

  if (result.outcome !== 'equipped' || !result.equipment) {
    throw new Error('装备接口结果无效');
  }
  const item = result.equipment;

  return {
    message: `成功装备 ${item.name}`,
    equipment: {
      ...item,
      equipment: { name: item.name, grade: { name: item.grade }, equipmentType: { name: item.equipmentType } }
    }
  };
}
