import { displayCurrencyText } from '@src/constants/currency';
import type { IssuedReward } from '@src/api/schemas/issued-reward';

/** Keep committed receipts readable on older servers that omit reward names. */
export function issuedRewardText(rewards: IssuedReward[]): string {
  const labels: Record<string, string> = {
    item: '物品',
    equipment: '装备',
    skill: '功法',
    skill_book: '功法',
    currency: '货币',
    recipe: '丹方',
    lootbox: '礼盒',
    soul_artifact: '本命物'
  };

  return rewards.length
    ? rewards.map(reward => `${displayCurrencyText(reward.name.trim() || `${labels[reward.type] ?? '奖励'}（名称暂缺）`)}x${reward.amount}`).join('、')
    : '无';
}
