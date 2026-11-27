//#region src/api/bot/battle-panel-numbers.ts
const battlePanelKeys = [
	"combatPower",
	"physicalAttack",
	"physicalDefense",
	"magicAttack",
	"magicDefense",
	"hp",
	"spiritualPower",
	"mentalPower",
	"speed",
	"critRate",
	"critDamage",
	"antiCritRate",
	"hitRate",
	"dodgeRate"
];
function parseBattlePanelNumbers(data) {
	for (const key of battlePanelKeys) if (typeof data[key] !== "number" || !Number.isSafeInteger(data[key])) throw new Error("查看信息战斗数值不完整");
	for (const key of ["mpRecoveryEfficiency", "mentalRecoveryEfficiency"]) {
		const number = data[key];
		if (number !== void 0 && (typeof number !== "number" || !Number.isFinite(number))) throw new Error("查看信息回复效率无效");
	}
	return data;
}

//#endregion
export { battlePanelKeys, parseBattlePanelNumbers };