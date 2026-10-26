import { requestBackend } from './client';
import { GLOSSARY_PAGE_SIZE } from '@src/constants/glossary';
import type { GlossaryQueryEntry } from '../schemas/glossary-query';

function identity(bid?: string): string {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return bid;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('词典接口返回格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('词典接口缺少数值字段');
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('词典接口缺少文本字段');
  }

  return value;
}
export function parseGlossaryEntry(value: unknown): GlossaryQueryEntry {
  const row = record(value);

  return {
    id: number(row.id),
    keyword: text(row.keyword),
    content: text(row.content),
    category: text(row.category),
    authorName: text(row.authorName),
    editCount: number(row.editCount),
    lastEditorName: text(row.lastEditorName)
  };
}
export async function getBackendGlossary(bid: string | undefined, page: number, filter: { keyword?: string; category?: string } = {}) {
  const data = record(await requestBackend(identity(bid), 'get_glossary', { query: { ...filter, page, pageSize: GLOSSARY_PAGE_SIZE } }));

  if (!Array.isArray(data.items)) {
    throw new Error('词典接口缺少列表');
  }
  const total = number(data.total);
  const pageSize = number(data.pageSize);

  if (pageSize !== GLOSSARY_PAGE_SIZE) {
    throw new Error('词典接口分页大小不一致');
  }

  return { entries: data.items.map(parseGlossaryEntry), total, totalPages: Math.ceil(total / pageSize), currentPage: number(data.page) };
}
export async function getBackendGlossaryEntry(bid: string | undefined, keyword: string): Promise<GlossaryQueryEntry | null> {
  const data = await requestBackend(identity(bid), 'get_glossary_entry', { query: { keyword } });

  return data === null ? null : parseGlossaryEntry(data);
}
