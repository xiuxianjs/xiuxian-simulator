/**
 * 查看战斗过程 - 业务逻辑层
 */
import { queryBackendBattleLog } from '@src/api/bot/battle-log-query';
import type { BackendRequestContext } from '@src/api/bot/context';
import { withBackendRepeatDetection } from '@src/utils/backendRepeatDetector';

type ViewLogResult =
  | { code: 'MISSING_ID' }
  | { code: 'MEMORY_ONLY' }
  | { code: 'NOT_FOUND'; data: { message: string } }
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'OK'; data: { log: string } };

export type { ViewLogResult };

export default async function App(params: {
  bid?: string;
  uid: number;
  logId: string;
  messageText: string;
  request?: BackendRequestContext;
}): Promise<ViewLogResult> {
  const { uid, logId, messageText } = params;

  if (!logId) {
    return { code: 'MISSING_ID' };
  }

  try {
    const { text: battleLog, readFailed, memoryShare } = await queryBackendBattleLog(params.bid, uid, logId, messageText);

    if (readFailed) {
      return { code: 'FAIL', data: { message: '查看战斗过程失败：战斗日志服务暂不可用' } };
    }

    if (!battleLog && memoryShare) {
      return { code: 'MEMORY_ONLY' };
    }

    if (!battleLog) {
      const repeatMsg = await withBackendRepeatDetection(params.bid, uid, messageText, '战斗日志不存在或已过期（战斗日志保存5分钟）', params.request);

      return { code: 'NOT_FOUND', data: { message: repeatMsg } };
    }

    return { code: 'OK', data: { log: battleLog } };
  } catch (error) {
    const msg = error instanceof Error ? `查看战斗过程失败：${error.message}` : '查看战斗过程失败';

    return { code: 'FAIL', data: { message: msg } };
  }
}
