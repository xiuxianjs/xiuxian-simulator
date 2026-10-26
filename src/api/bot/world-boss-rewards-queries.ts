import { requestBackend } from './client';
import type { WorldBossRewardsPreviewData } from '../schemas/world-boss-rewards-query';

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('凶兽奖励接口缺少数值字段');
  }

  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('凶兽奖励接口格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('凶兽奖励接口缺少数值字段');
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('凶兽奖励接口缺少文本字段');
  }

  return value;
}
export async function getBackendWorldBossRewards(bid: string | undefined, uid: number): Promise<WorldBossRewardsPreviewData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseWorldBossRewards(await requestBackend(bid, 'get_players_id_world_boss_rewards_preview', { path: { id: uid } }));
}
export function parseWorldBossRewards(value: unknown): WorldBossRewardsPreviewData {
  const data = record(value);
  const config = data.config === null ? null : record(data.config);

  if (!Array.isArray(data.tiers)) {
    throw new Error('凶兽奖励接口缺少档位');
  }

  return {
    stageLevel: integer(data.stageLevel),
    stageName: text(data.stageName),
    available:
      typeof data.available === 'boolean'
        ? data.available
        : (() => {
            throw new Error('凶兽奖励资格字段不完整');
          })(),
    unavailableMessage: text(data.unavailableMessage),
    claimableRewardCount: integer(data.claimableRewardCount),
    config:
      config === null
        ? null
        : {
            bossName: text(config.bossName),
            bossTitle: text(config.bossTitle),
            baseDamage: number(config.baseDamage)
          },
    tiers: data.tiers.map((value: unknown) => {
      const row = record(value);

      return {
        tierName: text(row.tierName),
        damagePercent: integer(row.damagePercent),
        conditionText: text(row.conditionText),
        spiritStone: integer(row.spiritStone),
        spiritCrystal: integer(row.spiritCrystal)
      };
    })
  };
}
