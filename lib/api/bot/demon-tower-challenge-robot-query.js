//#region src/api/bot/demon-tower-challenge-robot-query.ts
function demonTowerChallengeArguments(text) {
	const match = text.match(/妖塔挑战\s+(\d)/);
	return { stars: match ? Number(match[1]) : null };
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("妖塔挑战响应不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("妖塔挑战响应不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("妖塔挑战响应不完整");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("妖塔挑战响应不完整");
	return value;
}
function parseRobotDemonTowerChallenge(value) {
	const result = record(value);
	if (result.outcome === "usage") return { outcome: "usage" };
	if (result.outcome !== "result") throw new Error("妖塔挑战响应不完整");
	const data = record(result.data);
	if (!Array.isArray(data.milestonesTriggered) || !Array.isArray(data.availableBuffs) || ![
		"ROUND_LIMIT",
		"HP_THRESHOLD",
		"NO_SKILLS"
	].includes(String(data.condition)) || ![
		"A",
		"B",
		"draw",
		""
	].includes(String(data.battleWinner)) || data.logId !== void 0 && typeof data.logId !== "string") throw new Error("妖塔挑战响应不完整");
	return {
		outcome: "result",
		data: {
			logId: data.logId,
			success: boolean(data.success),
			starsEarned: number(data.starsEarned),
			scoreEarned: number(data.scoreEarned),
			totalTowerScore: number(data.totalTowerScore),
			spiritStoneEarned: number(data.spiritStoneEarned),
			layerCleared: boolean(data.layerCleared),
			allCleared: boolean(data.allCleared),
			nextLayer: number(data.nextLayer),
			nextStage: number(data.nextStage),
			cumulativeStars: number(data.cumulativeStars),
			needSelectBuff: boolean(data.needSelectBuff),
			condition: data.condition,
			conditionLabel: text(data.conditionLabel),
			battleWinner: data.battleWinner,
			battleRounds: number(data.battleRounds),
			milestonesTriggered: data.milestonesTriggered.map((value) => {
				const row = record(value);
				return {
					id: number(row.id),
					stars: number(row.stars),
					score: number(row.score)
				};
			}),
			availableBuffs: data.availableBuffs.map((value) => {
				const row = record(value);
				return {
					key: text(row.key),
					label: text(row.label),
					minStars: number(row.minStars),
					cnKey: text(row.cnKey)
				};
			})
		}
	};
}

//#endregion
export { demonTowerChallengeArguments, parseRobotDemonTowerChallenge };