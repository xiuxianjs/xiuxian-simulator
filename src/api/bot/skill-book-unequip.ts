import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { SkillBookUnequipResult } from '../schemas/skill-book-unequip';

export async function unequipBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillType: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<SkillBookUnequipResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  if (skillType !== '战技' && skillType !== '被动技' && skillType !== '神通') {
    throw new Error('功法类型无效');
  }
  const data = await requestBackend(bid, 'post_players_id_skill_books_unequip', {
    path: { id: uid },
    body: { skillType },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseBackendSkillBookUnequip(data);
}

export function parseBackendSkillBookUnequip(data: unknown): SkillBookUnequipResult {
  const value = data as SkillBookUnequipResult;

  if (
    !value ||
    !['unequipped', 'not_in_use'].includes(value.outcome) ||
    (value.outcome === 'not_in_use'
      ? value.skillBook !== null
      : !value.skillBook || [value.skillBook.name, value.skillBook.skillType].some(v => v !== null && typeof v !== 'string'))
  ) {
    throw new Error('换下功法响应不完整');
  }

  return value;
}
