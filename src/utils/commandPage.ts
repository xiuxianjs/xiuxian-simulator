/** 从聊天指令中提取页数，非法或缺省页码回到第一页。 */
export function parseCommandPage(messageText: string, commandName: string): number {
  const regex = new RegExp(`^(!|！|\\/|#|＃)?(${commandName})\\s*`, '');
  const argsText = messageText.replace(regex, '').trim();

  if (!argsText) {
    return 1;
  }

  const pageMatch = argsText.match(/^\d+/)?.at(0);

  if (pageMatch) {
    const pageNum = parseInt(pageMatch, 10);

    return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  }

  return 1;
}
