//#region src/response/attributes/battlePanelTable.ts
const formatPanelNumber = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 21 }).format;
function battlePanelTable(d) {
	return [
		"| 属性 | 数值 | 属性 | 数值 |",
		"| :--- | ---: | :--- | ---: |",
		`| 物理攻击 | ${formatPanelNumber(d.physicalAttack)} | 物理防御 | ${formatPanelNumber(d.physicalDefense)} |`,
		`| 法术攻击 | ${formatPanelNumber(d.magicAttack)} | 法术防御 | ${formatPanelNumber(d.magicDefense)} |`,
		`| 生命上限 | ${formatPanelNumber(d.hp)} | 灵力上限 | ${formatPanelNumber(d.spiritualPower)} |`,
		`| 速度 | ${formatPanelNumber(d.speed)} | 念力上限 | ${formatPanelNumber(d.mentalPower)} |`,
		`| 暴击率 | ${formatPanelNumber(d.critRate)}% | 暴击伤害 | ${formatPanelNumber(d.critDamage)}% |`,
		`| 抗暴率 | ${formatPanelNumber(d.antiCritRate)}% | 命中率 | ${formatPanelNumber(d.hitRate)}% |`,
		...d.mpRecoveryEfficiency !== void 0 && d.mentalRecoveryEfficiency !== void 0 ? [`| 回灵效率 | ${formatPanelNumber(d.mpRecoveryEfficiency)}% | 回念效率 | ${formatPanelNumber(d.mentalRecoveryEfficiency)}% |`] : [],
		`| 闪避率 | ${formatPanelNumber(d.dodgeRate)}% | | |`
	].join("\n");
}
function legacyBattlePanelTable(d) {
	return [
		"| 属性 | 数值 | 属性 | 数值 |",
		"| :--- | ---: | :--- | ---: |",
		`| 物理攻击 | ${formatPanelNumber(d.physicalAttack)} | 物理防御 | ${formatPanelNumber(d.physicalDefense)} |`,
		`| 法术攻击 | ${formatPanelNumber(d.magicAttack)} | 法术防御 | ${formatPanelNumber(d.magicDefense)} |`,
		`| 生命上限 | ${formatPanelNumber(d.hp)} | 速度 | ${formatPanelNumber(d.speed)} |`,
		`| 暴击率 | ${formatPanelNumber(d.critRate)}% | 暴击伤害 | ${formatPanelNumber(d.critDamage)}% |`
	].join("\n");
}

//#endregion
export { battlePanelTable, formatPanelNumber, legacyBattlePanelTable };