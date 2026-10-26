import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend } from './client';
import type { BattleLogQueryData } from '../schemas/battle-log-query';

/** The existing GET remains read-only; this query opts into presentation writes. */
export async function queryBackendBattleLog(bid: string | undefined, uid: number, logId: string, repeatCommand: string): Promise<BattleLogQueryData> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }
  if (!Number.isSafeInteger(uid) || uid <= 0 || typeof logId !== 'string' || logId.length === 0) {
    throw new Error('战斗日志查询参数无效');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_battle_log_query', {
    path: { id: uid },
    body: { logId },
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseBackendBattleLog(data, logId);
}

export function parseBackendBattleLog(data: unknown, logId: string): BattleLogQueryData {
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data) ||
    !('logId' in data) ||
    data.logId !== logId ||
    !('text' in data) ||
    !('readFailed' in data) ||
    (data.text !== null && typeof data.text !== 'string') ||
    typeof data.readFailed !== 'boolean' ||
    (data.readFailed && data.text !== null)
  ) {
    throw new Error('战斗日志响应不完整');
  }

  const share = 'memoryShare' in data ? data.memoryShare : undefined;
  const memoryShare =
    share && typeof share === 'object' && 'token' in share && typeof share.token === 'string' && 'expiresAt' in share && typeof share.expiresAt === 'string'
      ? { token: share.token, expiresAt: share.expiresAt }
      : undefined;

  return { logId: data.logId, text: data.text, readFailed: data.readFailed, ...(memoryShare ? { memoryShare } : {}) };
}

export function parseRobotBattleLog(data: unknown, logId: string): BattleLogQueryData {
  const result = parseBackendBattleLog(data, logId);

  if (result.readFailed || (!result.text && !result.memoryShare)) {
    throw new Error('战斗日志成功响应不完整');
  }

  return result;
}
