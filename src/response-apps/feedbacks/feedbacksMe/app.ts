import { getBackendFeedbacks } from '@src/api/bot';

/** 解析页数参数 */
export function parsePageNumber(messageText: string): number {
  const argsText = messageText.replace(/^(!|！|\/|#|＃)?(我的反馈)\s*/, '').trim();

  if (!argsText) {
    return 1;
  }

  const pageNum = parseInt(argsText);

  return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
}

/** 查询当前认证用户的反馈记录 */
export function getUserFeedbacks(bid: string | undefined, page: number) {
  return getBackendFeedbacks(bid, page);
}
