import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { LearnedSkillVisibilityResult } from '../schemas/skill-visibility';
export async function setBackendSkillVisibility(
  bid: string | undefined,
  uid: number,
  bookId: number,
  isHidden: boolean,
  request?: BackendRequestContext
): Promise<LearnedSkillVisibilityResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data: unknown = await requestBackend(bid, 'put_players_id_skill_books_learned_bookId_visibility', {
    path: { id: uid, bookId },
    body: { isHidden },
    ...context
  });

  return parseBackendSkillVisibility(data, bookId, isHidden);
}

export function parseBackendSkillVisibility(data: unknown, bookId: number, isHidden: boolean): LearnedSkillVisibilityResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('功法显示状态响应不完整');
  }
  const value = data as Record<string, unknown>;

  if (
    typeof value.code !== 'string' ||
    !['UPDATED', 'NOT_FOUND', 'IN_USE', 'UNCHANGED'].includes(value.code) ||
    value.bookId !== bookId ||
    typeof value.isHidden !== 'boolean' ||
    typeof value.message !== 'string' ||
    (value.name !== null && typeof value.name !== 'string')
  ) {
    throw new Error('功法显示状态响应不完整');
  }
  if (value.code === 'UPDATED' && value.isHidden !== isHidden) {
    throw new Error('功法显示状态不一致');
  }

  return data as LearnedSkillVisibilityResult;
}

export function parseRobotSkillVisibility(data: unknown, bookId: number, isHidden: boolean): LearnedSkillVisibilityResult {
  const result = parseBackendSkillVisibility(data, bookId, isHidden);

  if (result.code !== 'UPDATED') {
    throw new Error('功法显示状态响应不完整');
  }

  return result;
}
