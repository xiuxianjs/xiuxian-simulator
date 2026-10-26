import { BackendAPIError } from '@src/api/bot/client';
import { getBackendEmailDetail } from '@src/api/bot/email-detail';
/**
 * 查看邮件 - 数据层
 */
import { logger } from 'alemonjs';

import { emailDetailView } from '@src/response/email/findEmail/view';
export type { EmailDisplayGood } from '@src/response/email/findEmail/view';
export async function getFindEmailData(
  uid: number,
  messageText: string,
  bid?: string
): Promise<ReturnType<typeof emailDetailView> | { code: 'NOT_FOUND'; emailId: string }> {
  const id = messageText.replace(/^(!|！|\/|#|＃)?查看邮件/, '').trim();

  try {
    const emailId = Number(id);

    if (!Number.isFinite(emailId)) {
      throw new Error('邮件编号不是有限数字');
    }
    if (emailId <= 0 || emailId >= 2 ** 63 || !Number.isInteger(emailId)) {
      return { code: 'NOT_FOUND', emailId: id };
    }
    const result = await getBackendEmailDetail(bid, uid, emailId);

    if (!result) {
      return { code: 'NOT_FOUND', emailId: id };
    }

    return emailDetailView(result);
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 404) {
      return { code: 'NOT_FOUND', emailId: id };
    }
    logger.error('[查看邮件] 错误:', error);

    return { code: 'NOT_FOUND', emailId: messageText };
  }
}
