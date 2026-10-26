/**
 * 我的邮件列表 - 数据层
 */
import { getBackendEmails } from '@src/api';
import { logger } from 'alemonjs';

import { emailListView } from '@src/response/email/MyEmailList/view';
export type { EmailListItem } from '@src/response/email/MyEmailList/view';
const PAGE_SIZE = 5;

export async function getMyEmailListData(uid: number, messageText: string, bid?: string): Promise<ReturnType<typeof emailListView>> {
  try {
    const m = messageText.trim().match(/^(!|！|\/|#|＃)?我的邮件\s*(\d+)?$/);
    const page = m?.[2] ? Number(m[2]) : 1;

    const result = await getBackendEmails(bid, uid, page, PAGE_SIZE);

    return emailListView(result, page);
  } catch (error) {
    logger.error('[我的邮件] 错误:', error);

    throw error;
  }
}
