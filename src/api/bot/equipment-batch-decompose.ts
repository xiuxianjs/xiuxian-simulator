import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendEquipmentBatchGrade = { id: number; gradeName: string; level: number; count: number };
export type BackendEquipmentBatchPreview = {
  success: boolean;
  message: string;
  totalCount: number;
  processCount: number;
  remainingCount: number;
  gradeBreakdown: BackendEquipmentBatchGrade[];
  totalYield: number;
};
export type BackendEquipmentBatchDetail = { name: string; grade: string; yield: number };
export type BackendEquipmentBatchResult = {
  success: boolean;
  message: string;
  decomposedCount: number;
  remainingCount: number;
  totalYield: number;
  details: BackendEquipmentBatchDetail[];
};

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`一键分解装备接口字段无效: ${field}`);
  }

  return value;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`一键分解装备接口字段无效: ${field}`);
  }

  return value;
}

export function preview(value: unknown): BackendEquipmentBatchPreview {
  const data = record(value, '一键分解装备预览接口响应不完整');

  if (typeof data.success !== 'boolean' || !Array.isArray(data.gradeBreakdown)) {
    throw new Error('一键分解装备预览接口响应不完整');
  }

  const totalCount = integer(data.totalCount, 'totalCount', true);
  const processCount = integer(data.processCount, 'processCount', true);
  const remainingCount = integer(data.remainingCount, 'remainingCount', true);

  if (processCount !== Math.min(totalCount, 300) || remainingCount !== totalCount - processCount) {
    throw new Error('分解预览数量与每批300件限制不一致');
  }

  return {
    success: data.success,
    message: text(data.message, 'message'),
    totalCount,
    processCount,
    remainingCount,
    totalYield: integer(data.totalYield, 'totalYield', true),
    gradeBreakdown: data.gradeBreakdown.map(value => {
      const row = record(value, '一键分解装备品级数据无效');

      return {
        id: integer(row.id, 'grade.id'),
        gradeName: text(row.gradeName, 'grade.gradeName'),
        level: integer(row.level, 'grade.level', true),
        count: integer(row.count, 'grade.count')
      };
    })
  };
}

export async function previewBackendEquipmentBatchDecompose(bid: string | undefined, uid: number, gradeId?: number): Promise<BackendEquipmentBatchPreview> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return preview(
    await requestBackend(bid, 'get_players_id_equipment_decompose_preview', { path: { id: uid }, query: gradeId === undefined ? {} : { gradeId } })
  );
}

export async function batchDecomposeBackendEquipment(
  bid: string | undefined,
  uid: number,
  gradeId: number | undefined,
  request?: BackendRequestContext
): Promise<BackendEquipmentBatchResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_equipment_decompose_batch', {
    path: { id: uid },
    body: gradeId === undefined ? {} : { gradeId },
    ...writeContext(request)
  });

  return parseBackendEquipmentBatchDecompose(data);
}

export function parseBackendEquipmentBatchDecompose(value: unknown): BackendEquipmentBatchResult {
  const data = record(value, '一键分解装备接口响应不完整');

  if (typeof data.success !== 'boolean' || !Array.isArray(data.details)) {
    throw new Error('一键分解装备接口响应不完整');
  }

  return {
    success: data.success,
    message: text(data.message, 'message'),
    decomposedCount: integer(data.decomposedCount, 'decomposedCount', true),
    remainingCount: integer(data.remainingCount, 'remainingCount', true),
    totalYield: integer(data.totalYield, 'totalYield', true),
    details: data.details.map(value => {
      const row = record(value, '一键分解装备明细无效');

      return { name: text(row.name, 'detail.name'), grade: text(row.grade, 'detail.grade'), yield: integer(row.yield, 'detail.yield') };
    })
  };
}

export async function getBackendEquipmentDecomposeQuery(
  bid: string | undefined,
  uid: number,
  gradeName: string
): Promise<{ options: BackendEquipmentBatchPreview; preview: BackendEquipmentBatchPreview | null }> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = record(
    await requestBackend(bid, 'get_players_id_equipment_batch_decompose_query', { path: { id: uid }, query: { gradeName } }),
    '一键分解预览接口响应不完整'
  );

  return { options: preview(data.options), preview: data.preview === null ? null : preview(data.preview) };
}

export type RobotEquipmentBatchQuery =
  | { mode: 'choose'; options: BackendEquipmentBatchPreview }
  | { mode: 'preview'; options: BackendEquipmentBatchPreview; preview: BackendEquipmentBatchPreview; selectedGrade: { id: number; name: string } };

export function parseRobotEquipmentBatchQuery(value: unknown): RobotEquipmentBatchQuery {
  const row = record(value, '一键分解预览接口响应不完整');
  const options = preview(row.options);

  if (row.mode === 'choose') {
    return { mode: 'choose', options };
  }
  if (row.mode !== 'preview') {
    throw new Error('一键分解预览接口响应不完整');
  }
  const selected = record(row.selectedGrade, '一键分解预览接口响应不完整');

  return {
    mode: 'preview',
    options,
    preview: preview(row.preview),
    selectedGrade: { id: integer(selected.id, 'grade.id', true), name: text(selected.name, 'grade.name') }
  };
}
