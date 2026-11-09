const amountPattern = /^(月卡|金手指|VIP修为|天赋|师门赐福|回归增益|道侣同队|锦鲤赐福)\+([1-9]\d*)$/;
const legacyPercentPattern = /^锦鲤赐福：基础修为\+\d+(?:\.\d+)?%（同类与全部相加，独立加算）$/;

/** Keep the settled amounts together and only display recognized sources. */
export function dungeonExperienceBonusLines(text: string | undefined): string[] {
  const bonuses: string[] = [];
  let groupedCount = 0;
  let groupedAmount = 0n;
  const statuses: string[] = [];

  for (const note of text?.split(' · ') ?? []) {
    const amount = amountPattern.exec(note);

    if (amount) {
      if (bonuses.length < 3) {
        bonuses.push(`${amount[1]} +${amount[2]}`);
      } else {
        groupedCount++;
        groupedAmount += BigInt(amount[2]);
      }
    } else if (note === '锦鲤赐福：本次未满 1 点，已计入累积' || note === '锦鲤赐福：修为已达上限，本次额外入账 0 点' || legacyPercentPattern.test(note)) {
      statuses.push(note);
    }
  }
  if (groupedCount > 0) {
    bonuses.push(`其余 ${groupedCount} 项 +${groupedAmount}`);
  }
  if (bonuses.length === 1 && bonuses[0].startsWith('锦鲤赐福 ')) {
    return [`其中：${bonuses[0].replace(' ', '额外 ')} 修为`, ...statuses];
  }

  return bonuses.length ? [`其中：${bonuses.join(' · ')}`, ...statuses] : statuses;
}
