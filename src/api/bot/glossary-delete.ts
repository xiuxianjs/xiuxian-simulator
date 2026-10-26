import { repeatPresentationHeaders } from './repeat-presentation';
import type { GlossaryDeleteResult } from '../schemas/glossary-delete';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
export async function getBackendGlossaryEditPermission(bid: string | undefined) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const row = await requestBackend(bid, 'get_glossary_edit_permission', {});

  if (!row || typeof row.allowed !== 'boolean') {
    throw new Error('词典权限响应不完整');
  }

  return row.allowed;
}
export async function deleteBackendGlossary(bid: string | undefined, keyword: string, request?: BackendRequestContext): Promise<GlossaryDeleteResult> {
  if (!bid) {
    throw new Error('删除缺少平台身份');
  }
  const context = writeContext(request);
  const row = await requestBackend(bid, 'delete_glossary_keyword', { headers: repeatPresentationHeaders('删除词典'), path: { keyword }, ...context });

  return parseBackendGlossaryDelete(row);
}
export function parseBackendGlossaryDelete(row: any): GlossaryDeleteResult {
  if (
    !row ||
    !['deleted', 'not_found', 'rewarded', 'forbidden', 'log_failed'].includes(row.outcome) ||
    typeof row.stateChanged !== 'boolean' ||
    (row.logWritten !== null && typeof row.logWritten !== 'boolean') ||
    (row.entryId !== null && (typeof row.entryId !== 'number' || !Number.isSafeInteger(row.entryId) || row.entryId <= 0))
  ) {
    throw new Error('词典删除响应不完整');
  }
  const changed = row.outcome === 'deleted' || row.outcome === 'log_failed';

  if (
    row.stateChanged !== changed ||
    (changed ? row.entryId === null : row.entryId !== null) ||
    (row.outcome === 'deleted' ? row.logWritten !== true : row.outcome === 'log_failed' ? row.logWritten !== null : row.logWritten !== false)
  ) {
    throw new Error('词典删除阶段响应不完整');
  }
  if (row.outcome === 'log_failed') {
    throw new Error('词条状态已删除，日志写入结果未确认');
  }

  return row;
}
