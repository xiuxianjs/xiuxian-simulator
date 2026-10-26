/**
 * 一键删除邮件 - 数据层
 */
import { deleteAllBackendEmails } from '@src/api/bot/email-delete-all';
import type { BackendRequestContext } from '@src/api/bot/context';
import { withBackendRepeatDetection } from '@src/utils/backendRepeatDetector';
import { logger } from 'alemonjs';

type DeleteAllEmailResult = { code: 'EMPTY'; displayMsg: string } | { code: 'DELETED'; deleted: number };

export async function getDeleteAllEmailData(uid: number, bid?: string, request?: BackendRequestContext): Promise<DeleteAllEmailResult> {
  try {
    const result = await deleteAllBackendEmails(bid, uid, request);

    if (result.deleted === 0) {
      const displayMsg = await withBackendRepeatDetection(bid, uid, '一键删除邮件', '暂无可删除的邮件', request);

      return { code: 'EMPTY', displayMsg };
    }

    return { code: 'DELETED', deleted: result.deleted };
  } catch (error) {
    logger.error('[一键删除邮件] 错误:', error);
    const displayMsg = await withBackendRepeatDetection(bid, uid, '一键删除邮件', '操作失败，请稍后再试', request);

    return { code: 'EMPTY', displayMsg };
  }
}
