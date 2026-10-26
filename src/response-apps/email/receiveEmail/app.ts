/** 邮件领取数据层：服务端负责邮件状态、奖励、幂等与缓存失效。 */
import { claimBackendEmail } from '@src/api/bot/email-claim';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type ReceiveEmailResult = { code: 'INVALID_ID' } | { code: 'OK' } | { code: 'FAILED'; displayMsg: string };

export async function getReceiveEmailData(
  bid: string | undefined,
  uid: number,
  messageText: string,
  request?: BackendRequestContext
): Promise<ReceiveEmailResult> {
  const id = messageText.replace(/^(!|！|\/|#|＃)?领取邮件/, '').trim();
  const emailId = Number(id);

  if (!Number.isSafeInteger(emailId) || emailId < 1) {
    return { code: 'INVALID_ID' };
  }

  try {
    await claimBackendEmail(bid, uid, emailId, request);

    return { code: 'OK' };
  } catch (error) {
    logger.error('[领取邮件] 服务端操作失败:', error);

    return { code: 'FAILED', displayMsg: '领取失败，邮件不存在或已领取' };
  }
}
