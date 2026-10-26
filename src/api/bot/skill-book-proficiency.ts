import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendSkillBookProficiencyResult = {
  outcome: 'ok' | 'no_skill_books' | 'not_found' | 'invalid_input' | 'max_proficiency' | 'insufficient_points';
  message?: string;
  skillBookName?: string;
  consumedPoints?: number;
  oldProficiency?: number;
  newProficiency?: number;
  remainingPoints?: number;
  successCount?: number;
  failCount?: number;
  pityTriggered?: boolean;
  currentPoints?: number;
  requiredPoints?: number;
};

const outcomes = new Set<BackendSkillBookProficiencyResult['outcome']>([
  'ok',
  'no_skill_books',
  'not_found',
  'invalid_input',
  'max_proficiency',
  'insufficient_points'
]);

function integer(row: Record<string, unknown>, field: string): number {
  if (!Number.isInteger(row[field])) {
    throw new Error(`参悟功法接口字段无效: ${field}`);
  }

  return row[field] as number;
}

export async function useBackendSkillBookProficiency(
  bid: string | undefined,
  uid: number,
  identifier: string,
  points: number | '全部',
  request?: BackendRequestContext
): Promise<BackendSkillBookProficiencyResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const all = points === '全部';
  const data = await requestBackend(bid, 'post_players_id_skill_books_proficiency', {
    path: { id: uid },
    body: all ? { identifier, all } : { identifier, all, points },
    ...writeContext(request)
  });

  return parseBackendSkillBookProficiency(data);
}

export function parseBackendSkillBookProficiency(data: unknown): BackendSkillBookProficiencyResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('参悟功法接口响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (typeof row.outcome !== 'string' || !outcomes.has(row.outcome as BackendSkillBookProficiencyResult['outcome'])) {
    throw new Error('参悟功法接口响应不完整');
  }
  const outcome = row.outcome as BackendSkillBookProficiencyResult['outcome'];

  const result = { ...row };

  if (outcome === 'ok') {
    // Go omitempty omits zero counts/proficiency and false pity status.
    for (const field of ['oldProficiency', 'newProficiency', 'remainingPoints', 'successCount', 'failCount'] as const) {
      result[field] = row[field] === undefined ? 0 : row[field];
    }
    result.skillBookName = row.skillBookName === undefined ? '' : row.skillBookName;
    result.pityTriggered = row.pityTriggered === undefined ? false : row.pityTriggered;
    for (const field of ['skillBookName', 'consumedPoints', 'oldProficiency', 'newProficiency', 'remainingPoints', 'successCount', 'failCount'] as const) {
      if (field === 'skillBookName') {
        if (typeof result[field] !== 'string') {
          throw new Error(`参悟功法接口字段无效: ${field}`);
        }
      } else {
        integer(result, field);
      }
    }
    if (typeof result.pityTriggered !== 'boolean') {
      throw new Error('参悟功法接口字段无效: pityTriggered');
    }
  }
  if (outcome === 'insufficient_points') {
    result.currentPoints = row.currentPoints === undefined ? 0 : row.currentPoints;
    integer(result, 'currentPoints');
    integer(row, 'requiredPoints');
  }

  return result as BackendSkillBookProficiencyResult;
}
