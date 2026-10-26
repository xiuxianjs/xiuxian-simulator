//#region src/response/worldBoss/challenge/view.ts
function worldBossChallengeView(result, batchMode) {
	const last = batchMode ? result.lastRound : result;
	const batch = batchMode ? result : void 0;
	return {
		stageName: batch?.stageName ?? last.stageName,
		bossTitle: batch?.bossTitle ?? last.bossTitle,
		bossName: batch?.bossName ?? last.bossName,
		damageDealt: last.damageDealt,
		totalPlayerDamage: last.totalPlayerDamage,
		attackCount: last.attackCount,
		remainingAttempts: batch?.remainingAttempts ?? last.remainingAttempts,
		rank: last.rank,
		battle: last.battle,
		battleSummary: last.battleSummary,
		logId: last.logId,
		batchMode: Boolean(batch),
		stopReason: batch?.stopReason,
		rounds: batch?.rounds,
		totalDamageDealt: batch?.totalDamageDealt,
		attemptsUsed: batch?.attemptsUsed
	};
}

//#endregion
export { worldBossChallengeView };