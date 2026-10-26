import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendAutoEquipRow = {
  typeName: string;
  equipped: boolean;
  equipmentName?: string;
  reason?: string;
};

export type BackendAutoEquipResult = {
  success: boolean;
  message: string;
  results: BackendAutoEquipRow[];
  power?: number;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('一键装备接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`一键装备接口字段无效: ${field}`);
  }

  return value;
}

function row(value: unknown): BackendAutoEquipRow {
  const data = record(value);

  if (typeof data.typeName !== 'string' || typeof data.equipped !== 'boolean') {
    throw new Error('一键装备接口结果字段无效');
  }

  return {
    typeName: data.typeName,
    equipped: data.equipped,
    equipmentName: optionalText(data.equipmentName, 'equipmentName'),
    reason: optionalText(data.reason, 'reason')
  };
}

export async function autoEquipBackendEquipment(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendAutoEquipResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_equipment_auto_equip', {
    path: { id: uid },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseBackendEquipmentAutoEquip(data);
}

export function parseBackendEquipmentAutoEquip(value: unknown): BackendAutoEquipResult {
  const data = record(value);

  if (typeof data.success !== 'boolean' || typeof data.message !== 'string' || !Array.isArray(data.results)) {
    throw new Error('一键装备接口响应不完整');
  }
  if (data.power !== undefined && (typeof data.power !== 'number' || !Number.isFinite(data.power))) {
    throw new Error('一键装备接口战力无效');
  }

  return { success: data.success, message: data.message, results: data.results.map(row), ...(data.power === undefined ? {} : { power: data.power }) };
}

export function parseRobotEquipmentAutoEquip(value: unknown): BackendAutoEquipResult {
  const out = parseBackendEquipmentAutoEquip(value);

  if (!out.success && out.results.length === 0) {
    throw new Error('一键装备接口响应不完整');
  }

  return out;
}
