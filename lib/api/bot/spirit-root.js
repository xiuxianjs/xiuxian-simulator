//#region src/api/bot/spirit-root.ts
const row = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("灵根响应不完整");
	return value;
};
const number = (value) => {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("灵根数值不完整");
	return value;
};
const text = (value) => {
	if (typeof value !== "string") throw new Error("灵根文案不完整");
	return value;
};
const bool = (value) => {
	if (typeof value !== "boolean") throw new Error("灵根状态不完整");
	return value;
};
function parseSpiritRoot(value) {
	const v = row(value);
	return {
		granted: bool(v.granted),
		title: text(v.title),
		quality: number(v.quality),
		qualityName: text(v.qualityName),
		cultivation: number(v.cultivation),
		stagePoints: number(v.stagePoints),
		stageTarget: number(v.stageTarget),
		overflow: number(v.overflow),
		bonusPercent: number(v.bonusPercent),
		nextBonusPercent: number(v.nextBonusPercent),
		nextQualityName: text(v.nextQualityName),
		requiredRealmName: text(v.requiredRealmName),
		canFeed: bool(v.canFeed),
		canPromote: bool(v.canPromote),
		meditationActive: bool(v.meditationActive),
		activeMeditationBonusPercent: number(v.activeMeditationBonusPercent),
		message: text(v.message)
	};
}
const sources = (value) => {
	if (value === void 0) return [];
	if (!Array.isArray(value)) throw new Error("灵药来源条件不完整");
	return value.map((input) => {
		const v = row(input);
		return {
			dungeonId: number(v.dungeonId),
			name: text(v.name),
			realmLimit: text(v.realmLimit)
		};
	});
};
function parseSpiritRootMaterials(value) {
	if (!Array.isArray(value)) throw new Error("灵药列表不完整");
	return value.map((input) => {
		const v = row(input);
		if (!Array.isArray(v.sources)) throw new Error("灵药来源不完整");
		return {
			itemId: number(v.itemId),
			name: text(v.name),
			points: number(v.points),
			quantity: number(v.quantity),
			locked: bool(v.locked),
			seedName: text(v.seedName),
			sources: v.sources.map(text),
			sourceDetails: sources(v.sourceDetails),
			seedSources: sources(v.seedSources),
			seedAvailable: v.seedAvailable === void 0 ? void 0 : bool(v.seedAvailable)
		};
	});
}
function parseSpiritRootPreview(value) {
	const v = row(value);
	return {
		itemId: number(v.itemId),
		itemName: text(v.itemName),
		requested: number(v.requested),
		consumed: number(v.consumed),
		pointsAdded: number(v.pointsAdded),
		before: number(v.before),
		after: number(v.after),
		quality: number(v.quality),
		stageTarget: number(v.stageTarget),
		stageBefore: number(v.stageBefore),
		stageAfter: number(v.stageAfter)
	};
}
function parseSpiritRootMutation(value) {
	const v = row(value);
	return {
		view: parseSpiritRoot(v.view),
		message: text(v.message)
	};
}

//#endregion
export { parseSpiritRoot, parseSpiritRootMaterials, parseSpiritRootMutation, parseSpiritRootPreview };