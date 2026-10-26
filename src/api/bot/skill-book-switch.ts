import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type { SkillBookMaximum, SkillBookSwitchResponse } from '../schemas/skill-book-switch';
import type { SkillBookSwitchResponse } from '../schemas/skill-book-switch';

import { parseSkillBookMaximum } from '../schemas/skill-book-maximum';

const skillTypes = new Set(['战技', '被动技', '神通']);

function summary(value: unknown): SkillBookSwitchResponse['skillBook'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== 'number' ||
    !Number.isSafeInteger(row.id) ||
    row.id < 1 ||
    typeof row.name !== 'string' ||
    typeof row.skillType !== 'string' ||
    !skillTypes.has(row.skillType)
  ) {
    return undefined;
  }

  return { id: row.id, name: row.name, skillType: row.skillType as SkillBookSwitchResponse['skillBook']['skillType'] };
}

export async function switchBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  skillType: SkillBookSwitchResponse['skillBook']['skillType'],
  force: boolean,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<SkillBookSwitchResponse> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_skill_books_skillBookId_switch', {
    path: { id: uid, skillBookId },
    body: { skillType, force },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseSkillBookSwitchResponse(data);
}

export function parseSkillBookSwitchResponse(data: unknown): SkillBookSwitchResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('切换功法响应不完整');
  }
  const row = data as Record<string, unknown>;
  const book = summary(row.skillBook);
  const old = row.oldSkillBook === undefined ? undefined : summary(row.oldSkillBook);
  const targetMaximum = row.targetMaximum === undefined ? undefined : parseSkillBookMaximum(row.targetMaximum);
  const oldMaximum = row.oldMaximum === undefined ? undefined : parseSkillBookMaximum(row.oldMaximum);
  const comparisonLines = Array.isArray(row.comparisonLines) && row.comparisonLines.every(line => typeof line === 'string') ? row.comparisonLines : undefined;
  const confirmationMessage = typeof row.confirmationMessage === 'string' ? row.confirmationMessage : undefined;

  if (!book || (row.outcome !== 'switched' && row.outcome !== 'confirmation_required')) {
    throw new Error('切换功法响应不完整');
  }
  if (row.outcome === 'confirmation_required' && (!old || !targetMaximum || !oldMaximum || !comparisonLines || !confirmationMessage)) {
    throw new Error('切换功法确认数据不完整');
  }

  return { outcome: row.outcome, skillBook: book, oldSkillBook: old, targetMaximum, oldMaximum, comparisonLines, confirmationMessage };
}
