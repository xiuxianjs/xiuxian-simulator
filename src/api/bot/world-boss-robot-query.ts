import { parseWorldBossInfo } from './world-boss-info-queries';
import { parseWorldBossRanking } from './world-boss-ranking-queries';
import { parseWorldBossRewards } from './world-boss-rewards-queries';
import { worldBossInfoView, worldBossRankingView, worldBossRewardsView } from '@src/response/worldBoss/view';

export function parseRobotWorldBossInfo(value: unknown) {
  return worldBossInfoView(parseWorldBossInfo(value));
}
export function parseRobotWorldBossRanking(value: unknown) {
  const facts = parseWorldBossRanking(value);

  if (!facts.available) {
    throw new Error(facts.unavailableMessage);
  }

  return worldBossRankingView(facts);
}
export function parseRobotWorldBossRewards(value: unknown) {
  const facts = parseWorldBossRewards(value);

  if (!facts.available || !facts.config) {
    throw new Error(facts.unavailableMessage);
  }

  return worldBossRewardsView(facts);
}
