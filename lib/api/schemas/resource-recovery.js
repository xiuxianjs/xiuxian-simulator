//#region src/api/schemas/resource-recovery.ts
/** Older servers omit recovery projections; absence is not a zero bonus. */
function parseRecoveryEffects(value) {
	if (value === void 0 || value === null) return [];
	if (!Array.isArray(value)) throw new Error("恢复效率来源数据无效");
	for (const item of value) if (!item || typeof item !== "object" || ![
		"equipment_set",
		"skill_book",
		"soul_artifact"
	].includes(item.source) || ![
		"templateId",
		"mp",
		"mental",
		"pieces",
		"currentPieces"
	].every((key) => typeof item[key] === "number" && Number.isFinite(item[key]) && item[key] >= 0) || ![
		"name",
		"status",
		"statusText",
		"conditionText"
	].every((key) => typeof item[key] === "string") || typeof item.active !== "boolean") throw new Error("恢复效率来源数据无效");
	return value;
}
function parseRecoverySummary(value) {
	if (value === void 0 || value === null) return;
	if (typeof value !== "object" || Array.isArray(value)) throw new Error("恢复效率汇总数据无效");
	const item = value;
	if (typeof item.configured !== "boolean" || typeof item.enabled !== "boolean" || typeof item.note !== "string" || ![
		"cap",
		"mpTotal",
		"mentalTotal",
		"mp",
		"mental"
	].every((key) => typeof item[key] === "number" && Number.isFinite(item[key]) && item[key] >= 0) || item.mp > item.cap || item.mental > item.cap) throw new Error("恢复效率汇总数据无效");
	return {
		...item,
		sources: parseRecoveryEffects(item.sources)
	};
}
function recoveryEffectText(effect) {
	const stats = [effect.mp > 0 ? `回灵效率 +${effect.mp}%` : "", effect.mental > 0 ? `回念效率 +${effect.mental}%` : ""].filter(Boolean).join("，");
	const pieces = effect.pieces > 0 && effect.status !== "preview" ? `（${effect.currentPieces}/${effect.pieces}件）` : "";
	return `${effect.name}${pieces}：${stats} · ${effect.statusText}`;
}

//#endregion
export { parseRecoveryEffects, parseRecoverySummary, recoveryEffectText };