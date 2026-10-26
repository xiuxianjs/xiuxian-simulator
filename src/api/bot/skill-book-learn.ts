import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { SkillBookLearnResponse, SkillBookLearnSummary } from '../schemas/skill-book-learn';
import { parseSkillBookMaximum } from '../schemas/skill-book-maximum';

const outcomes = new Set<SkillBookLearnResponse['outcome']>([
  'learned',
  'confirmation_required',
  'empty_bag',
  'not_found',
  'unidentified',
  'already_learned',
  'locked',
  'in_use_conflict',
  'lower_grade'
]);
const skillTypes = new Set(['战技', '被动技', '神通']);

function summary(value: unknown): SkillBookLearnSummary | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== 'number' ||
    !Number.isSafeInteger(row.id) ||
    row.id < 1 ||
    typeof row.name !== 'string' ||
    typeof row.grade !== 'string' ||
    typeof row.realm !== 'string' ||
    !Number.isInteger(row.gradeLevel) ||
    !Number.isInteger(row.proficiency) ||
    typeof row.skillType !== 'string' ||
    !skillTypes.has(row.skillType)
  ) {
    return undefined;
  }

  return row as SkillBookLearnSummary;
}

function refund(value: unknown): SkillBookLearnResponse['refundInfo'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;

  if (
    ['totalExp', 'baseExp', 'upgradeExp', 'upgradeCount', 'transferredProficiency'].some(key => !Number.isInteger(row[key])) ||
    !Array.isArray(row.items) ||
    row.items.some(
      item => !item ||
        typeof item !== 'object' ||
        !Number.isInteger((item as Record<string, unknown>).itemId) ||
        typeof (item as Record<string, unknown>).name !== 'string' ||
        !Number.isInteger((item as Record<string, unknown>).quantity) ||
        !Number.isInteger((item as Record<string, unknown>).expValue)
    )
  ) {
    return undefined;
  }

  return row as SkillBookLearnResponse['refundInfo'];
}

export async function learnBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  forceReplace: boolean,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<SkillBookLearnResponse> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_skill_books_skillBookId_learn', {
    path: { id: uid, skillBookId },
    body: { forceReplace },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseBackendSkillBookLearn(data);
}

export function parseBackendSkillBookLearn(data: unknown): SkillBookLearnResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('学习功法响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (typeof row.outcome !== 'string' || !outcomes.has(row.outcome as SkillBookLearnResponse['outcome'])) {
    throw new Error('学习功法响应不完整');
  }
  const result: SkillBookLearnResponse = {
    outcome: row.outcome as SkillBookLearnResponse['outcome'],
    skillBook: summary(row.skillBook),
    oldSkillBook: summary(row.oldSkillBook),
    targetMaximum: parseSkillBookMaximum(row.targetMaximum),
    oldMaximum: parseSkillBookMaximum(row.oldMaximum),
    refundInfo: refund(row.refundInfo)
  };
  const needsBook = new Set<SkillBookLearnResponse['outcome']>([
    'learned',
    'confirmation_required',
    'unidentified',
    'already_learned',
    'locked',
    'in_use_conflict',
    'lower_grade'
  ]);

  if (needsBook.has(result.outcome) && !result.skillBook) {
    throw new Error('学习功法响应缺少目标功法');
  }
  if (['confirmation_required', 'in_use_conflict', 'lower_grade'].includes(result.outcome) && !result.oldSkillBook) {
    throw new Error('学习功法响应缺少已学功法');
  }
  if (result.outcome === 'confirmation_required' && (!result.targetMaximum || !result.oldMaximum)) {
    throw new Error('学习功法确认数据不完整');
  }
  if (result.outcome === 'learned' && result.oldSkillBook && !result.refundInfo) {
    throw new Error('学习功法替换响应缺少返还结果');
  }

  return result;
}

export function parseRobotSkillBookLearn(data: unknown): SkillBookLearnResponse {
  const result = parseBackendSkillBookLearn(data);

  if (result.outcome !== 'learned' && result.outcome !== 'confirmation_required') {
    throw new Error('学习功法响应不完整');
  }

  return result;
}
