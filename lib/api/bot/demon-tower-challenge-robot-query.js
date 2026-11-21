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
function buffOption(value) {
	const row = record(value);
	return {
		key: text(row.key),
		label: text(row.label),
		minStars: number(row.minStars),
		cnKey: text(row.cnKey)
	};
}
function parseBuffGap(value) {
	const row = record(value);
	const locked = Array.isArray(row.locked) ? row.locked.map((entry) => {
		const item = record(entry);
		return {
			key: text(item.key),
			label: text(item.label),
			cnKey: text(item.cnKey),
			minStars: number(item.minStars),
			shortBy: number(item.shortBy)
		};
	}) : [];
	return {
		kind: row.kind === "hardGate" ? "hardGate" : "config",
		missingName: text(row.missingName),
		reason: text(row.reason),
		required: number(row.required),
		available: number(row.available),
		candidates: Array.isArray(row.candidates) ? row.candidates.map(buffOption) : [],
		...row.preselected === void 0 || row.preselected === null ? {} : { preselected: buffOption(row.preselected) },
		locked,
		pendingBuffSelections: number(row.pendingBuffSelections),
		cumulativeStars: number(row.cumulativeStars),
		recoverPath: text(row.recoverPath)
	};
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
			...data.talentSpiritStoneBonus === void 0 ? {} : { talentSpiritStoneBonus: number(data.talentSpiritStoneBonus) },
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
			availableBuffs: data.availableBuffs.map(buffOption),
			...data.autoBuff === void 0 ? {} : { autoBuff: (() => {
				const row = record(data.autoBuff);
				return {
					key: text(row.key),
					label: text(row.label),
					cnKey: text(row.cnKey),
					minStars: number(row.minStars),
					revokePath: text(row.revokePath)
				};
			})() },
			...data.buffNeeded === void 0 ? {} : { buffNeeded: parseBuffGap(data.buffNeeded) }
		}
	};
}

//#endregion
export { demonTowerChallengeArguments, parseRobotDemonTowerChallenge };