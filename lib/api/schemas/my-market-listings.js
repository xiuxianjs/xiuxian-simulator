//#region src/api/schemas/my-market-listings.ts
function assertMyMarketInstance(value, message) {
	if (value === null) return;
	if (typeof value !== "object" || !value || Array.isArray(value)) throw new Error(message);
	const attrs = value;
	if (![
		"status",
		"gradeId",
		"washCount",
		"hasUpgraded"
	].every((key) => attrs[key] === null || typeof attrs[key] === "number" && Number.isSafeInteger(attrs[key])) || ![
		"physicalAttack",
		"magicAttack",
		"physicalDefense",
		"magicDefense",
		"hp",
		"physicalAttackPercent",
		"magicAttackPercent",
		"physicalDefensePercent",
		"magicDefensePercent",
		"hpPercent",
		"speed",
		"critRate",
		"critDamage",
		"maxPhysicalAttack",
		"maxMagicAttack",
		"maxPhysicalDefense",
		"maxMagicDefense",
		"maxHp",
		"maxPhysicalAttackPercent",
		"maxMagicAttackPercent",
		"maxPhysicalDefensePercent",
		"maxMagicDefensePercent",
		"maxHpPercent",
		"maxSpeed",
		"maxCritRate",
		"maxCritDamage"
	].every((key) => attrs[key] === null || typeof attrs[key] === "number" && Number.isFinite(attrs[key]))) throw new Error(message);
}

//#endregion
export { assertMyMarketInstance };