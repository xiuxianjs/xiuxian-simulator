import type { LimitedEventRewardQueryFields, LimitedEventRewardQueryNames } from '../schemas/limited-event-reward-query';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('活动奖励数据不完整');
  }

  return value as Record<string, unknown>;
}
export function parseLimitedEventRewardFields(value: unknown): LimitedEventRewardQueryFields {
  const row = object(value);
  const numbers = [
    'rewardSpiritStone',
    'rewardSpiritCrystal',
    'rewardSpiritMilk',
    'rewardCheckInCoin',
    'rewardTowerScore',
    'rewardReputation',
    'rewardTongxin',
    'rewardPaidToken',
    'rewardFreeToken'
  ];
  const jsons = ['rewardItemsJson', 'rewardEquipmentsJson', 'rewardSkillsJson', 'rewardRecipesJson', 'rewardSoulArtifactsJson', 'rewardTitlesJson'];

  if (
    numbers.some(key => typeof row[key] !== 'number' || !Number.isSafeInteger(row[key])) ||
    jsons.some(key => row[key] !== null && typeof row[key] !== 'string')
  ) {
    throw new Error('活动奖励字段不完整');
  }

  return Object.fromEntries([...numbers, ...jsons].map(key => [key, row[key]])) as LimitedEventRewardQueryFields;
}
export function parseLimitedEventRewardNames(value: unknown): LimitedEventRewardQueryNames {
  const row = object(value);
  const keys = ['itemNames', 'equipmentNames', 'skillNames', 'recipeNames', 'soulArtifactNames', 'titleNames'];

  return Object.fromEntries(
    keys.map(key => {
      const names = object(row[key]);

      if (Object.entries(names).some(([id, name]) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0 || typeof name !== 'string')) {
        throw new Error('活动奖励名称不完整');
      }

      return [key, { ...names }];
    })
  ) as LimitedEventRewardQueryNames;
}
