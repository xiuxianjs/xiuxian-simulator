import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeTraceContext } from './client';
import type { BackendRequestContext } from './context';
import type { EquipmentUnequipOneResult } from '../schemas/equipment-unequip-one';
export async function unequipBackendEquipmentOne(
  bid: string | undefined,
  uid: number,
  equipmentTypeName: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<EquipmentUnequipOneResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_equipment_unequip_one', {
    path: { id: uid },
    body: { equipmentTypeName },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeTraceContext(request)
  });

  return parseBackendEquipmentUnequipOne(data);
}

export function parseBackendEquipmentUnequipOne(value: unknown): EquipmentUnequipOneResult {
  const data = value as EquipmentUnequipOneResult;

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !['type_missing', 'templates_missing', 'not_equipped', 'unequipped', 'failed'].includes(data.outcome) ||
    !['none', 'write_uncertain', 'updated', 'cache_cleared'].includes(data.stage) ||
    (data.instanceId !== null && (typeof data.instanceId !== 'number' || !Number.isSafeInteger(data.instanceId) || data.instanceId < 1))
  ) {
    throw new Error('卸下装备响应不完整');
  }

  return data;
}

export function parseRobotEquipmentUnequipOne(value: unknown): EquipmentUnequipOneResult {
  const out = parseBackendEquipmentUnequipOne(value);

  if (out.outcome !== 'unequipped' || out.stage !== 'cache_cleared' || out.instanceId === null) {
    throw new Error('卸下装备响应不完整');
  }

  return out;
}
