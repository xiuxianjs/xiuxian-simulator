import { repeatPresentationHeaders } from './repeat-presentation';
import type { GlossaryEditQuotaData, GlossaryPolicy, GlossaryUpsertResult } from '../schemas/glossary-upsert';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

export async function getBackendGlossaryPolicy(bid: string | undefined, category?: string): Promise<GlossaryPolicy> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const row = await requestBackend(bid, 'get_glossary_policy', { query: category ? { category } : {} });

  if (
    !row ||
    !Array.isArray(row.categories) ||
    !row.categories.every(value => typeof value === 'string') ||
    typeof row.defaultCategory !== 'string' ||
    !integer(row.keywordMaxLength) ||
    !integer(row.contentMaxLength) ||
    typeof row.categoryValid !== 'boolean'
  ) {
    throw new Error('词典规则响应不完整');
  }

  return row;
}

export async function getBackendGlossaryEditQuota(bid: string | undefined): Promise<GlossaryEditQuotaData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const row = await requestBackend(bid, 'get_glossary_edit_quota', {});

  if (
    !row ||
    typeof row.allowed !== 'boolean' ||
    typeof row.withinLimit !== 'boolean' ||
    (row.allowed
      ? !integer(row.dailyLimit) || !integer(row.used) || row.used < 0 || row.withinLimit !== row.used < row.dailyLimit
      : row.dailyLimit !== null || row.used !== null || row.withinLimit)
  ) {
    throw new Error('词典配额响应不完整');
  }

  return row;
}
export async function upsertBackendGlossary(
  bid: string | undefined,
  keyword: string,
  content: string,
  request?: BackendRequestContext
): Promise<GlossaryUpsertResult> {
  if (!bid) {
    throw new Error('录入缺少平台身份');
  }
  const context = writeContext(request);
  const row = await requestBackend(bid, 'put_glossary_keyword', {
    headers: repeatPresentationHeaders('录入词典'),
    path: { keyword },
    body: { content, commandContent: true },
    ...context
  });

  return parseBackendGlossaryUpsert(row);
}
export function parseBackendGlossaryUpsert(row: any): GlossaryUpsertResult {
  const outcomes = [
    'created',
    'updated',
    'forbidden',
    'daily_limit',
    'keyword_too_long',
    'content_too_long',
    'keyword_sensitive',
    'content_sensitive',
    'write_failed'
  ];

  if (
    !row ||
    !outcomes.includes(row.outcome) ||
    typeof row.category !== 'string' ||
    typeof row.reason !== 'string' ||
    !Array.isArray(row.matchedWords) ||
    !row.matchedWords.every(v => typeof v === 'string') ||
    (row.entryId !== null && (!integer(row.entryId) || row.entryId <= 0)) ||
    (row.isNew !== null && typeof row.isNew !== 'boolean') ||
    (row.dailyLimit !== null && !integer(row.dailyLimit)) ||
    (row.used !== null && (!integer(row.used) || row.used < 0)) ||
    !['none', 'entry', 'log', 'contribution'].includes(row.completedStage) ||
    (row.failedStage !== null && !['entry', 'log', 'contribution'].includes(row.failedStage)) ||
    typeof row.commitUnknown !== 'boolean'
  ) {
    throw new Error('词典录入响应不完整');
  }
  const success = row.outcome === 'created' || row.outcome === 'updated';
  const failed = row.outcome === 'write_failed';
  const sensitive = row.outcome === 'keyword_sensitive' || row.outcome === 'content_sensitive';
  const failedPredecessor = { entry: 'none', log: 'entry', contribution: 'log' };

  if (
    (success && (row.entryId === null || row.isNew !== (row.outcome === 'created') || row.completedStage !== 'contribution')) ||
    (failed &&
      (row.failedStage === null ||
        row.isNew === null ||
        row.completedStage !== failedPredecessor[row.failedStage] ||
        (row.completedStage !== 'none' && row.entryId === null))) ||
    (!success && !failed && (row.entryId !== null || row.isNew !== null || row.completedStage !== 'none')) ||
    (!failed && (row.failedStage !== null || row.commitUnknown)) ||
    (sensitive ? row.matchedWords.length === 0 : row.matchedWords.length !== 0) ||
    (row.outcome === 'forbidden' ? row.dailyLimit !== null || row.used !== null : row.dailyLimit === null || row.used === null)
  ) {
    throw new Error('词典录入阶段响应不完整');
  }
  if (failed) {
    throw new Error(`词典录入阶段失败：${row.failedStage}；已完成：${row.completedStage}`);
  }

  return row;
}
