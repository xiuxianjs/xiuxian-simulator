import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Change = { itemId: number; name: string; quantity: number; expValue: number };
export type BackendSkillBookUpgradeResult =
  | {
      outcome: 'upgraded';
      skillBook: { id: number; name: string; skillType: string };
      upgradeCount: number;
      consumedExp: number;
      consumedSpiritStone: number;
      consumedItems: Change[];
      overflowExp: number;
      refundedItems: Change[];
      attributeUpgrade: { name: string; growth: number; currentValue: number; maxValue: number; isNew: boolean };
    }
  | { outcome: 'no_skill_books' | 'not_found' };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('升级功法接口响应不完整');
  }

  return value as Record<string, unknown>;
}
function integer(row: Record<string, unknown>, field: string): number {
  if (!Number.isSafeInteger(row[field])) {
    throw new Error(`升级功法接口字段无效: ${field}`);
  }

  return row[field] as number;
}
function numberValue(row: Record<string, unknown>, field: string): number {
  if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) {
    throw new Error(`升级功法接口字段无效: ${field}`);
  }

  return row[field];
}
function changes(value: unknown): Change[] {
  if (!Array.isArray(value)) {
    throw new Error('升级功法接口字段无效: items');
  }

  return value.map(item => {
    const row = record(item);

    if (typeof row.name !== 'string') {
      throw new Error('升级功法接口字段无效: item.name');
    }

    return { itemId: integer(row, 'itemId'), name: row.name, quantity: integer(row, 'quantity'), expValue: integer(row, 'expValue') };
  });
}

export async function upgradeBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  request?: BackendRequestContext
): Promise<BackendSkillBookUpgradeResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const row = record(
    await requestBackend(bid, 'post_players_id_skill_books_skillBookId_upgrade', { path: { id: uid, skillBookId }, body: {}, ...writeContext(request) })
  );

  if (row.outcome !== 'upgraded' && row.outcome !== 'no_skill_books' && row.outcome !== 'not_found') {
    throw new Error('升级功法接口响应不完整');
  }
  if (row.outcome !== 'upgraded') {
    return { outcome: row.outcome };
  }
  const skillBookRow = record(row.skillBook);

  if (typeof skillBookRow.name !== 'string' || typeof skillBookRow.skillType !== 'string') {
    throw new Error('升级功法接口字段无效: skillBook');
  }
  if (typeof row.attribute !== 'string' || typeof row.isNewAttribute !== 'boolean') {
    throw new Error('升级功法接口字段无效: attribute');
  }

  return {
    outcome: 'upgraded',
    skillBook: { id: integer(skillBookRow, 'id'), name: skillBookRow.name, skillType: skillBookRow.skillType },
    upgradeCount: integer(row, 'upgradeCount'),
    consumedExp: integer(row, 'consumedExp'),
    consumedSpiritStone: integer(row, 'consumedSpiritStone'),
    consumedItems: changes(row.consumedItems),
    overflowExp: integer(row, 'overflowExp'),
    refundedItems: changes(row.refundedItems),
    attributeUpgrade: {
      name: row.attribute,
      growth: numberValue(row, 'growth'),
      currentValue: numberValue(row, 'currentValue'),
      maxValue: numberValue(row, 'maxValue'),
      isNew: row.isNewAttribute
    }
  };
}
