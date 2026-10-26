const positiveInteger = (value: string | undefined) => value === undefined || (Number.isSafeInteger(Number(value)) && Number(value) > 0);

/** Guard user input before legacy SDK normalization can turn an invalid target into a default operation. */
export function ownCaveInputError(kind: 'cultivate' | 'plant' | 'action', input: string): string | null {
  const text = input.trim().replace(/^[!！/#＃]/, '');

  if (kind === 'cultivate') {
    const match = text.match(/^开垦(?:\s+(\d+))?$/);

    return /^(开垦所有|一键开垦)$/.test(text) || (match && positiveInteger(match[1])) ? null : '灵田参数格式错误：地块编号须为正整数。';
  }
  if (kind === 'plant') {
    if (text.startsWith('一键播种')) {
      const match = text.match(/^一键播种\s+(\S+)(?:[ \t]+([0-9]+))?$/);

      return match && (match[2] === undefined || (positiveInteger(match[2]) && Number(match[2]) <= 100))
        ? null
        : '灵田参数格式错误：/一键播种 XXX丹 [炉数]，默认10炉，炉数须为1～100的正整数。';
    }
    const match = text.match(/^播种(?:\s+(.+))?$/);
    const first = match?.[1]?.trim().split(/\s+/)[0];

    // Non-numeric text remains the full seed name, including spaces and digit prefixes.
    return match && (first === undefined || !/^\d+$/.test(first) || positiveInteger(first)) ? null : '灵田参数格式错误：地块编号须为正整数，请选择可用灵种。';
  }
  if (/^一键(?:灵田)?(?:加速|催熟)$/.test(text)) {
    return null;
  }
  const care = text.match(/^(?:一键)?(?:浇灌|除虫|除草|收割)(?:\s+(\d+))?$/);
  const upgrade = text.match(/^升级灵田(?:\s+(\d+))?$/);

  if ((care && positiveInteger(care[1])) || (upgrade && positiveInteger(upgrade[1]))) {
    return null;
  }
  const accelerate = text.match(/^灵田加速(?:\s+(\d+)(?:\s+(灵肥|小绿瓶|灵石|催熟)(?:\s+(\d+))?)?)?$/);

  if (accelerate && positiveInteger(accelerate[1]) && positiveInteger(accelerate[3])) {
    return null;
  }

  return '灵田参数格式错误：请选择地块操作，数量须为正整数。';
}

/** The command starts at the beginning; a seed name may itself contain 播种. */
export function ownCavePlantArguments(text: string): { plotIndex: string | null; seedName: string | null; recipeName?: string; count?: string } {
  const recipe = text.trim().match(/^[!！/#＃]?一键播种\s+(\S+)(?:[ \t]+([0-9]+))?$/);

  if (recipe) {
    return { plotIndex: null, seedName: null, recipeName: recipe[1], count: String(Number(recipe[2] ?? 10)) };
  }
  const match = text.trim().match(/^[!！/#＃]?播种(?:\s+(\d+))?(?:\s+(.+))?$/);

  const seedName = match?.[2]?.trim() ?? '';

  return { plotIndex: match?.[1] === undefined ? null : String(Number(match[1])), seedName: seedName.length > 0 ? seedName : null };
}
