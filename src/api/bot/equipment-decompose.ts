import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendEquipmentDecomposeResult = {
  instanceId: number;
  equipmentName: string;
  equipmentGrade: string;
  yieldItemId: number;
  yieldItemName: string;
  yieldQuantity: number;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('装备分解接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`装备分解接口字段无效: ${field}`);
  }

  return value;
}

export async function decomposeBackendEquipment(
  bid: string | undefined,
  uid: number,
  instanceId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendEquipmentDecomposeResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  const data = await requestBackend(bid, 'post_players_id_equipment_decompose', {
    path: { id: uid },
    body: { instanceId },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseBackendEquipmentDecompose(data);
}

export function parseBackendEquipmentDecompose(value: unknown): BackendEquipmentDecomposeResult {
  const row = record(value);
  const strings = ['equipmentName', 'equipmentGrade', 'yieldItemName'] as const;

  for (const field of strings) {
    if (typeof row[field] !== 'string' || !row[field]) {
      throw new Error(`装备分解接口字段无效: ${field}`);
    }
  }

  return {
    instanceId: positiveInteger(row.instanceId, 'instanceId'),
    equipmentName: row.equipmentName as string,
    equipmentGrade: row.equipmentGrade as string,
    yieldItemId: positiveInteger(row.yieldItemId, 'yieldItemId'),
    yieldItemName: row.yieldItemName as string,
    yieldQuantity: positiveInteger(row.yieldQuantity, 'yieldQuantity')
  };
}
