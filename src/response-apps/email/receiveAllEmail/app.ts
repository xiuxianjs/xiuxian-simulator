/** 一键领取邮件：Go 服务端是邮件状态与附件结算的唯一解释器。 */
import { claimAllBackendEmails } from '@src/api/bot/email-claim-all';
import type { BackendRequestContext } from '@src/api/bot/context';
import { withBackendRepeatDetection } from '@src/utils/backendRepeatDetector';
import { logger } from 'alemonjs';

type ReceiveAllEmailResult =
  { code: 'NO_MAIL'; displayMsg: string } | { code: 'ALL_CLAIMED'; displayMsg: string } | { code: 'OK'; claimed: number; skipped: number };

export async function getReceiveAllEmailData(uid: number, bid?: string, request?: BackendRequestContext): Promise<ReceiveAllEmailResult> {
  try {
    const result = await claimAllBackendEmails(bid, uid, request);

    if (result.total === 0) {
      return {
        code: 'NO_MAIL',
        displayMsg: await withBackendRepeatDetection(bid, uid, '一键领取邮件', '暂无可领取的邮件附件', request)
      };
    }

    if (result.claimed === 0) {
      return {
        code: 'ALL_CLAIMED',
        displayMsg: await withBackendRepeatDetection(bid, uid, '一键领取邮件', '所有邮件附件已领取过，无需重复领取', request)
      };
    }

    return { code: 'OK', claimed: result.claimed, skipped: result.skipped };
  } catch (error) {
    logger.error('[一键领取邮件] 服务端操作失败:', error);

    return {
      code: 'NO_MAIL',
      displayMsg: await withBackendRepeatDetection(bid, uid, '一键领取邮件', '操作失败，请稍后再试', request)
    };
  }
}
