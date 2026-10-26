import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { SkillBookDecomposeItem, SkillBookDecomposeResponse } from '../schemas/skill-book-decompose';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('分解功法接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new Error(`分解功法接口字段无效: ${field}`);
  }

  return value;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) {
    throw new Error(`分解功法接口字段无效: ${field}`);
  }

  return value;
}

function item(value: unknown): SkillBookDecomposeItem {
  const row = record(value);

  return {
    itemId: integer(row.itemId, 'refundedItems.itemId', true),
    name: text(row.name, 'refundedItems.name'),
    quantity: integer(row.quantity, 'refundedItems.quantity', true),
    expValue: integer(row.expValue, 'refundedItems.expValue', true)
  };
}

export async function decomposeBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<SkillBookDecomposeResponse> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  const data = await requestBackend(bid, 'post_players_id_skill_books_skillBookId_decompose', {
    path: { id: uid, skillBookId },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseBackendSkillBookDecompose(data);
}

export function parseBackendSkillBookDecompose(value: unknown): SkillBookDecomposeResponse {
  const row = record(value);

  if (!Array.isArray(row.refundedItems)) {
    throw new Error('分解功法接口字段无效: refundedItems');
  }

  return {
    instanceId: integer(row.instanceId, 'instanceId', true),
    name: text(row.name, 'name'),
    skillType: text(row.skillType, 'skillType'),
    grade: text(row.grade, 'grade'),
    realm: text(row.realm, 'realm'),
    refundExp: integer(row.refundExp, 'refundExp'),
    baseExp: integer(row.baseExp, 'baseExp'),
    refundedItems: row.refundedItems.map(item)
  };
}
