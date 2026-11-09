import { listBubble } from '@src/response/presentation';
import type { GameEvent } from '@src/types/event';
import { isPrivateEvent } from '@src/utils/privateEvent';

export function parsePVPTargetSuggestions<T>(value: unknown, parseBattle: (value: unknown) => T) {
  if (typeof value !== 'object' || value === null || !('targetSuggestions' in value)) {
    return { mode: 'battle' as const, battle: parseBattle(value) };
  }

  const ids: unknown = value.targetSuggestions;
  const reason = 'reason' in value ? value.reason : undefined;

  if (
    !Array.isArray(ids) ||
    ids.length > 5 ||
    !ids.every(uid => typeof uid === 'number' && Number.isSafeInteger(uid) && uid > 0) ||
    new Set(ids).size !== ids.length ||
    (reason !== undefined && typeof reason !== 'string')
  ) {
    throw new Error('同境界道友列表响应无效');
  }

  return { mode: 'suggestions' as const, ids: ids as number[], reason };
}

export function pvpTargetSuggestionsBubble(event: GameEvent, command: '打劫' | '比试', ids: number[], reason?: string) {
  return listBubble({
    title: '同境界道友',
    bid: event.UserId,
    isPrivate: isPrivateEvent(event),
    items: ids.length
      ? ids.map(uid => ({ title: '道友', id: uid, lines: [], actions: [{ label: command, command: `/${command} ${uid}` }] }))
      : [{ lines: [reason ? `状态：${reason}` : '结果：暂无可选的同境界道友。'] }]
  });
}
