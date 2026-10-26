//#region src/api/schemas/skill-book-maximum.ts
const maximumKeys = [
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
	"critDamage"
];
function parseSkillBookMaximum(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	const row = value;
	if (maximumKeys.some((key) => typeof row[key] !== "number" || !Number.isFinite(row[key]))) return;
	return Object.fromEntries(maximumKeys.map((key) => [key, row[key]]));
}

//#endregion
export { parseSkillBookMaximum };