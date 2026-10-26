/**
 * 删除邮件 - 数据层
 */
import { attemptBackendEmailDelete } from '@src/api/bot/email-delete';
import type { BackendRequestContext } from '@src/api/bot/context';
import { withBackendRepeatDetection } from '@src/utils/backendRepeatDetector';
import { logger } from 'alemonjs';

type DeleteEmailResult =
  { code: 'INVALID_ID' } | { code: 'CONFIRM'; emailId: number; expiresInSeconds: number } | { code: 'DELETED' } | { code: 'FAILED'; displayMsg: string };

const MIN_ID = 1;

export async function getDeleteEmailData(uid: number, messageText: string, bid?: string, request?: BackendRequestContext): Promise<DeleteEmailResult> {
  try {
    const id = messageText.replace(/^(!|！|\/|#|＃)?删除邮件/, '').trim();
    const curId = Number(id);

    if (!Number.isSafeInteger(curId) || curId < MIN_ID) {
      return { code: 'INVALID_ID' };
    }
    const result = await attemptBackendEmailDelete(bid, uid, curId, request);

    if (result.confirmationRequired) {
      return { code: 'CONFIRM', emailId: curId, expiresInSeconds: result.confirmationExpiresInSeconds! };
    }

    if (result.deleted) {
      return { code: 'DELETED' };
    }

    const displayMsg = await withBackendRepeatDetection(bid, uid, '删除邮件', '无法删除该邮件（可能已删除或邮件不存在）', request);

    return { code: 'FAILED', displayMsg };
  } catch (error) {
    logger.error('[删除邮件] 错误:', error);
    const displayMsg = await withBackendRepeatDetection(bid, uid, '删除邮件', '操作失败，请稍后再试', request);

    return { code: 'FAILED', displayMsg };
  }
}
