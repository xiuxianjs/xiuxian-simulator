/** Reject ambiguous UI input before any combined business mutation. */
export function consumeInputProblem(rawText: string): string | undefined {
  const text = rawText.trim();
  const args = text
    .replace(/^[!！/#＃]?(消耗|服用|学习丹方|炼化)\s*/, '')
    .trim()
    .split(/\s+/);
  const refining = /^[!！/#＃]?炼化/.test(text) && /^\d+$/.test(args[0]);

  if (refining) {
    if (!Number.isSafeInteger(Number(args[0])) || Number(args[0]) < 1 || args.length > 2 || (args[1] !== undefined && args[1] !== '确认')) {
      return '炼化参数错误：请使用本人本命物实例编号，后面只可追加“确认”，不要附用量或其他确认文字。';
    }
  } else if (args.length > 2 || (args[1] !== undefined && (!/^\d+$/.test(args[1]) || !Number.isSafeInteger(Number(args[1]))))) {
    return '使用参数错误：数量必须是完整的正整数，不接受小数、尾部文字或多余参数。';
  }

  return undefined;
}
