import { requestBackend } from './client';

export type SoulPathEffectChange = { label: string; before: number; after: number; deltaText: string };

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

export async function getBackendSoulPathComparison(
  bid: string | undefined,
  uid: number
): Promise<{ changes: SoulPathEffectChange[]; emptyMessage: string; quote: string }> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('战斗属性查询参数无效');
  }

  const data = record(await requestBackend(bid, 'get_players_id_battle_attributes', { path: { id: uid } }), '战斗属性响应不完整');

  return parseSoulPathComparison(data.soulPathComparison);
}

export function parseSoulPathComparison(value: unknown): { changes: SoulPathEffectChange[]; emptyMessage: string; quote: string } {
  const comparison = record(value, '战斗属性响应不完整');

  if (!Array.isArray(comparison.changes) || typeof comparison.emptyMessage !== 'string' || typeof comparison.quote !== 'string') {
    throw new Error('道途属性对比响应不完整');
  }
  const changes = comparison.changes.map(value => {
    const change = record(value, '道途属性对比响应不完整');

    if (typeof change.label !== 'string' || !Number.isInteger(change.before) || !Number.isInteger(change.after) || typeof change.deltaText !== 'string') {
      throw new Error('道途属性对比响应不完整');
    }

    return { label: change.label, before: change.before as number, after: change.after as number, deltaText: change.deltaText };
  });

  return { changes, emptyMessage: comparison.emptyMessage, quote: comparison.quote };
}
