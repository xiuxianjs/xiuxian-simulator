//#region src/api/bot/treasure-effects.ts
/** Missing notices keep older services compatible; supplied notices are strict. */
function parseTreasureEffects(value) {
	if (value === void 0) return;
	if (!Array.isArray(value)) throw new Error("宝物增益回执无效");
	return value.map((row) => {
		if (!row || typeof row !== "object" || Array.isArray(row) || !Number.isSafeInteger(row.treasureId) || row.treasureId <= 0 || typeof row.name !== "string" || !row.name.trim() || typeof row.description !== "string" || !row.description.trim() || !Array.isArray(row.benefits) || !row.benefits.length || row.benefits.some((benefit) => typeof benefit !== "string" || !benefit.trim())) throw new Error("宝物增益回执无效");
		return {
			treasureId: row.treasureId,
			name: row.name,
			description: row.description,
			benefits: [...row.benefits]
		};
	});
}
/** Ordinary credited experience, excluding the separately displayed treasure gain. */
function parseNormalExperienceGained(value) {
	if (value === void 0) return;
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("普通修为回执无效");
	return value;
}

//#endregion
export { parseNormalExperienceGained, parseTreasureEffects };