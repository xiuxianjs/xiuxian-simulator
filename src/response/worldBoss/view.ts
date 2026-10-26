import { formatNumber } from '@src/utils/formatHelper';
import type { WorldBossInfoQueryData } from '@src/api/schemas/world-boss-info-query';
import type { WorldBossRankingQuery } from '@src/api/schemas/world-boss-ranking-query';
import type { WorldBossRewardsPreviewData } from '@src/api/schemas/world-boss-rewards-query';

export function worldBossInfoView(info: WorldBossInfoQueryData) {
  return {
    bossTitle: info.config.bossTitle,
    bossName: info.config.bossName,
    stageName: info.stageName,
    activeTimeDesc: info.activeTimeDesc,
    isActive: info.isActive,
    bossHp: formatNumber(info.config.baseHp),
    dailyAttempts: info.config.dailyAttempts,
    maxRounds: info.config.maxRounds,
    hasInstance: info.hasInstance,
    totalDamage: formatNumber(info.totalDamage),
    totalAttacks: info.totalAttacks,
    playerDamage: formatNumber(info.playerDamage),
    playerAttacks: info.playerAttacks,
    remainingAttempts: Number(info.remainingAttempts),
    playerRank: info.playerRank,
    claimableRewardCount: info.claimableRewardCount,
    rewardPendingUntilEnd: info.rewardPendingUntilEnd
  };
}

export function worldBossRankingView(facts: WorldBossRankingQuery) {
  return {
    stageName: facts.stageName,
    ranking: facts.ranking.map(item => ({
      rank: item.rank,
      name: item.name,
      damage: formatNumber(item.damage)
    })),
    myRank: facts.myRank,
    myDamage: formatNumber(facts.myDamage)
  };
}

export function worldBossRewardsView(facts: WorldBossRewardsPreviewData) {
  const { stageName, config, tiers, claimableRewardCount } = facts;

  if (!config) {
    throw new Error(facts.unavailableMessage);
  }

  return {
    stageName,
    bossTitle: config.bossTitle,
    bossName: config.bossName,
    baseDamage: formatNumber(config.baseDamage),
    claimableRewardCount,
    tiers: tiers.map(tier => ({
      tierName: tier.tierName,
      condText: tier.conditionText,
      spiritStone: tier.spiritStone,
      spiritCrystal: tier.spiritCrystal
    }))
  };
}
