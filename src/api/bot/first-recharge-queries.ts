import { requestBackend } from './client';
import type { FirstRechargeQueryReward, FirstRechargeQueryTier } from '../schemas/first-recharge-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('首充信息接口格式不完整');
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('首充信息接口缺少文本字段');
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('首充信息接口缺少数值字段');
  }

  return value;
}
function names(value: unknown): Record<number, string> {
  return Object.fromEntries(
    Object.entries(record(value)).map(([id, name]) => {
      if (!Number.isSafeInteger(Number(id))) {
        throw new Error('首充信息接口名称ID无效');
      }

      return [Number(id), text(name)];
    })
  );
}
export async function getBackendFirstRechargeInfo(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendFirstRechargeInfo(await requestBackend(bid, 'get_players_id_recharge_first', { path: { id: uid } }));
}

export function parseBackendFirstRechargeInfo(value: unknown) {
  const data = record(value);
  const allNames = record(data.names);

  if (!Array.isArray(data.tiers)) {
    throw new Error('首充信息接口缺少档位');
  }

  return {
    names: { items: names(allNames.items), equipments: names(allNames.equipments), skills: names(allNames.skills) },
    tiers: data.tiers.map((value: unknown): Pick<FirstRechargeQueryTier, 'tierAmountYuan' | 'status' | 'rewards' | 'rewardText'> => {
      const tier = record(value);

      if ((tier.status !== 'locked' && tier.status !== 'claimable' && tier.status !== 'claimed') || !Array.isArray(tier.rewards)) {
        throw new Error('首充信息接口档位不完整');
      }
      const rewards: FirstRechargeQueryReward[] = tier.rewards.map((value: unknown) => {
        const reward = record(value);

        return { type: text(reward.type), currencyCode: text(reward.currencyCode), itemId: number(reward.itemId), quantity: number(reward.quantity) };
      });

      return { tierAmountYuan: number(tier.tierAmountYuan), status: tier.status, rewards, rewardText: text(tier.rewardText) };
    })
  };
}
