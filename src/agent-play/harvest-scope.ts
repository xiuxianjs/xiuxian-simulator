const digit: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const parsePlot = (value: string): number => {
  if (/^\d+$/u.test(value)) {
    return Number(value);
  }
  if (/^[一二两三四五六七八九]?十[一二三四五六七八九]?$/u.test(value)) {
    const [tens, ones] = value.split('十');

    return (tens ? digit[tens] : 1) * 10 + (ones ? digit[ones] : 0);
  }

  return digit[value] ?? NaN;
};

/** The provider owns harvest scope. Model tool arguments cannot widen or replace it. */
export function requestedHarvestPlot(message: string): number {
  const text = message.replace(/“[^”]*”|「[^」]*」|"[^"\n]*"|`[^`]*`/gu, '');
  const numeric = '[零一二两三四五六七八九十百千万\\d]+';
  const pattern = new RegExp(`(?:灵田|药田|地块)(?:里|的)?\\s*(?:第)?(${numeric})(?:号|块)?|(?:第)?(${numeric})(?:号|块)(?:灵田|药田|地块|田|地)`, 'gu');
  const matches = [...text.matchAll(pattern)];

  if (
    /随机|任意|某块|这块|那块|上一块|上次/u.test(text) ||
    new RegExp(`${numeric}(?:号|块)?(?:和|、|到|至|[~～-])\\s*(?:第)?${numeric}`, 'u').test(text) ||
    new RegExp(`(?:灵田|药田|地块).{0,20}(?:和|、|到|至|[~～-])\\s*(?:第)?${numeric}`, 'u').test(text) ||
    matches.some(match => /[.．+\-负\d]$/u.test(text.slice(0, match.index))) ||
    matches.some(match => /^[点.．][零一二两三四五六七八九\d]/u.test(text.slice(match.index + match[0].length))) ||
    (matches.length > 0 && /全部|所有|每(?:一)?块/u.test(text))
  ) {
    throw new Error('请明确采收全部本人灵田，或一个具体地块编号；当前不推断多地块或模糊范围。');
  }
  const plots = [...new Set(matches.map(match => parsePlot(match[1] ?? match[2])))];

  if (plots.length > 1 || plots.some(plot => !Number.isSafeInteger(plot) || plot < 1 || plot > 2147483647)) {
    throw new Error('地块范围无效或包含多个编号，请明确一个地块或全部本人灵田。');
  }
  if (!plots.length && /(?:灵田|药田|地块).{0,4}第|第.{0,4}(?:块|号)/u.test(text)) {
    throw new Error('无法识别地块编号，请使用明确的数字。');
  }

  return plots[0] ?? 0;
}
