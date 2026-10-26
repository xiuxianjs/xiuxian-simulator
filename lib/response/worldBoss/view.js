import { formatNumber } from "../../utils/formatHelper.js";

//#region src/response/worldBoss/view.ts
function worldBossInfoView(info) {
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
function worldBossRankingView(facts) {
	return {
		stageName: facts.stageName,
		ranking: facts.ranking.map((item) => ({
			rank: item.rank,
			name: item.name,
			damage: formatNumber(item.damage)
		})),
		myRank: facts.myRank,
		myDamage: formatNumber(facts.myDamage)
	};
}
function worldBossRewardsView(facts) {
	const { stageName, config, tiers, claimableRewardCount } = facts;
	if (!config) throw new Error(facts.unavailableMessage);
	return {
		stageName,
		bossTitle: config.bossTitle,
		bossName: config.bossName,
		baseDamage: formatNumber(config.baseDamage),
		claimableRewardCount,
		tiers: tiers.map((tier) => ({
			tierName: tier.tierName,
			condText: tier.conditionText,
			spiritStone: tier.spiritStone,
			spiritCrystal: tier.spiritCrystal
		}))
	};
}

//#endregion
export { worldBossInfoView, worldBossRankingView, worldBossRewardsView };