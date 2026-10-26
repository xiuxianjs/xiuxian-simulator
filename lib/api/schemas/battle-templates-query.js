//#region src/api/schemas/battle-templates-query.ts
function isBattleTemplateSummary(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const row = value;
	const count = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
	return count(row.slot) && typeof row.name === "string" && count(row.equipmentCount) && count(row.missingEquipmentCount) && count(row.missingSkillCount) && Array.isArray(row.equipmentNames) && row.equipmentNames.every((name) => typeof name === "string") && !!row.skillNames && typeof row.skillNames === "object" && !Array.isArray(row.skillNames) && Object.values(row.skillNames).every((name) => typeof name === "string");
}

//#endregion
export { isBattleTemplateSummary };