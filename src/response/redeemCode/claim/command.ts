export function extractCode(messageText: string) {
  return messageText.replace(/^(!|！|\/|#|＃)?(礼包码|兑换码|礼品码)/, '').trim();
}
