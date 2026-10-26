import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendSkillBookBatchUpgrade = {
  outcome: 'ok' | 'no_skill_books' | 'not_found';
  target?: { id: number; name: string };
  successCount: number;
  totalConsumedExp: number;
  totalConsumedSpiritStone: number;
  lastUpgradeCount: number;
  attributeChanges: Array<{ name: string; growth: number; currentValue: number; maxValue: number; isNew: boolean }>;
  attributeLines: string[];
  stopReason: string;
  upgradeCount: number;
  skillBookId: number;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('连续升级功法接口响应不完整');
  }

  return value as Record<string, unknown>;
}
function integer(row: Record<string, unknown>, field: string): number {
  if (!Number.isSafeInteger(row[field])) {
    throw new Error(`连续升级功法接口字段无效: ${field}`);
  }

  return row[field] as number;
}
function numeric(row: Record<string, unknown>, field: string): number {
  if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) {
    throw new Error(`连续升级功法接口字段无效: ${field}`);
  }

  return row[field];
}

export async function batchUpgradeBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  upgradeCount: number,
  request?: BackendRequestContext
): Promise<BackendSkillBookBatchUpgrade> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return parseSkillBookBatchUpgrade(
    await requestBackend(bid, 'post_players_id_skill_books_skillBookId_batch_upgrade', {
      path: { id: uid, skillBookId },
      body: { upgradeCount },
      ...writeContext(request)
    })
  );
}

export function parseSkillBookBatchUpgrade(value: unknown): BackendSkillBookBatchUpgrade {
  const data = record(value);

  if (data.outcome !== 'ok' && data.outcome !== 'no_skill_books' && data.outcome !== 'not_found') {
    throw new Error('连续升级功法接口响应不完整');
  }
  for (const field of ['successCount', 'totalConsumedExp', 'totalConsumedSpiritStone', 'lastUpgradeCount', 'upgradeCount', 'skillBookId'] as const) {
    integer(data, field);
  }
  if (
    typeof data.stopReason !== 'string' ||
    !Array.isArray(data.attributeChanges) ||
    !Array.isArray(data.attributeLines) ||
    !data.attributeLines.every(line => typeof line === 'string')
  ) {
    throw new Error('连续升级功法接口响应不完整');
  }
  const attributeChanges = data.attributeChanges.map(value => {
    const row = record(value);

    if (typeof row.name !== 'string' || typeof row.isNew !== 'boolean') {
      throw new Error('连续升级功法接口字段无效: attributeChanges');
    }

    return { name: row.name, growth: numeric(row, 'growth'), currentValue: numeric(row, 'currentValue'), maxValue: numeric(row, 'maxValue'), isNew: row.isNew };
  });
  const target =
    data.target === undefined
      ? undefined
      : (() => {
          const row = record(data.target);

          if (typeof row.name !== 'string') {
            throw new Error('连续升级功法接口字段无效: target.name');
          }

          return { id: integer(row, 'id'), name: row.name };
        })();

  if (data.outcome === 'ok' && !target) {
    throw new Error('连续升级功法接口响应缺少目标功法');
  }

  return {
    outcome: data.outcome,
    target,
    successCount: integer(data, 'successCount'),
    totalConsumedExp: integer(data, 'totalConsumedExp'),
    totalConsumedSpiritStone: integer(data, 'totalConsumedSpiritStone'),
    lastUpgradeCount: integer(data, 'lastUpgradeCount'),
    attributeChanges,
    attributeLines: data.attributeLines,
    stopReason: data.stopReason,
    upgradeCount: integer(data, 'upgradeCount'),
    skillBookId: integer(data, 'skillBookId')
  };
}
