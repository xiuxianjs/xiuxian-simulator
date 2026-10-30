import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendSkillBookBatchGrade = { id: number; gradeName: string; level: number; count: number };
export type BackendSkillBookBatchItem = { itemId: number; name: string; quantity: number; expValue: number };
export type BackendSkillBookBatchPreview = {
  success: boolean;
  message: string;
  totalCount: number;
  processCount: number;
  remainingCount: number;
  gradeBreakdown: BackendSkillBookBatchGrade[];
  totalExp: number;
  estimatedItems: BackendSkillBookBatchItem[];
};
export type BackendSkillBookBatchResult = {
  success: boolean;
  message: string;
  decomposedCount: number;
  remainingCount: number;
  totalExp: number;
  items: BackendSkillBookBatchItem[];
};

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`一键分解功法接口字段无效: ${field}`);
  }

  return value;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`一键分解功法接口字段无效: ${field}`);
  }

  return value;
}

function item(value: unknown): BackendSkillBookBatchItem {
  const row = record(value, '一键分解功法残页数据无效');

  return {
    itemId: integer(row.itemId, 'item.itemId'),
    name: text(row.name, 'item.name'),
    quantity: integer(row.quantity, 'item.quantity'),
    expValue: integer(row.expValue, 'item.expValue')
  };
}

export function preview(value: unknown): BackendSkillBookBatchPreview {
  const data = record(value, '一键分解功法预览接口响应不完整');

  if (typeof data.success !== 'boolean' || !Array.isArray(data.gradeBreakdown) || !Array.isArray(data.estimatedItems)) {
    throw new Error('一键分解功法预览接口响应不完整');
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
    totalExp: integer(data.totalExp, 'totalExp', true),
    gradeBreakdown: data.gradeBreakdown.map(value => {
      const row = record(value, '一键分解功法品级数据无效');

      return {
        id: integer(row.id, 'grade.id'),
        gradeName: text(row.gradeName, 'grade.gradeName'),
        level: integer(row.level, 'grade.level', true),
        count: integer(row.count, 'grade.count')
      };
    }),
    estimatedItems: data.estimatedItems.map(item)
  };
}

export async function previewBackendSkillBookBatchDecompose(bid: string | undefined, uid: number, gradeId?: number): Promise<BackendSkillBookBatchPreview> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return preview(
    await requestBackend(bid, 'get_players_id_skill_books_decompose_preview', { path: { id: uid }, query: gradeId === undefined ? {} : { gradeId } })
  );
}

export async function batchDecomposeBackendSkillBooks(
  bid: string | undefined,
  uid: number,
  gradeId: number | undefined,
  request?: BackendRequestContext
): Promise<BackendSkillBookBatchResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const value = await requestBackend(bid, 'post_players_id_skill_books_decompose_batch', {
    path: { id: uid },
    body: gradeId === undefined ? {} : { gradeId },
    ...writeContext(request)
  });

  return parseBackendSkillBookBatchDecompose(value);
}

export function parseBackendSkillBookBatchDecompose(value: unknown): BackendSkillBookBatchResult {
  const data = record(value, '一键分解功法接口响应不完整');

  if (typeof data.success !== 'boolean' || !Array.isArray(data.items)) {
    throw new Error('一键分解功法接口响应不完整');
  }

  return {
    success: data.success,
    message: text(data.message, 'message'),
    decomposedCount: integer(data.decomposedCount, 'decomposedCount', true),
    remainingCount: integer(data.remainingCount, 'remainingCount', true),
    totalExp: integer(data.totalExp, 'totalExp', true),
    items: data.items.map(item)
  };
}

export async function getBackendSkillBookDecomposeQuery(
  bid: string | undefined,
  uid: number,
  gradeName: string
): Promise<{ options: BackendSkillBookBatchPreview; preview: BackendSkillBookBatchPreview | null }> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = record(
    await requestBackend(bid, 'get_players_id_skill_books_batch_decompose_query', { path: { id: uid }, query: { gradeName } }),
    '一键分解预览接口响应不完整'
  );

  return { options: preview(data.options), preview: data.preview === null ? null : preview(data.preview) };
}

export type RobotSkillBookBatchQuery =
  | { mode: 'choose'; options: BackendSkillBookBatchPreview }
  | { mode: 'preview'; options: BackendSkillBookBatchPreview; preview: BackendSkillBookBatchPreview; selectedGrade: { id: number; name: string } };

export function parseRobotSkillBookBatchQuery(value: unknown): RobotSkillBookBatchQuery {
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
