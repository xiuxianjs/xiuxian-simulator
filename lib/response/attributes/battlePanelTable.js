import { formatFullNumber, formatGameAmount } from "../../utils/formatHelper.js";

//#region src/response/attributes/battlePanelTable.ts
function recoveryEfficiencyRow(mp = 0, mental = 0) {
	return `| 回灵效率 | ${formatFullNumber(mp)}% | 回念效率 | ${formatFullNumber(mental)}% |`;
}
function battlePanelTable(d) {
	return [
		"| 属性 | 数值 | 属性 | 数值 |",
		"| :--- | ---: | :--- | ---: |",
		`| 物理攻击 | ${formatGameAmount(d.physicalAttack)} | 物理防御 | ${formatGameAmount(d.physicalDefense)} |`,
		`| 法术攻击 | ${formatGameAmount(d.magicAttack)} | 法术防御 | ${formatGameAmount(d.magicDefense)} |`,
		`| 生命上限 | ${formatGameAmount(d.hp)} | 灵力上限 | ${formatGameAmount(d.spiritualPower)} |`,
		`| 速度 | ${formatGameAmount(d.speed)} | 念力上限 | ${formatGameAmount(d.mentalPower)} |`,
		`| 暴击率 | ${formatFullNumber(d.critRate)}% | 暴击伤害 | ${formatFullNumber(d.critDamage)}% |`,
		`| 抗暴率 | ${formatFullNumber(d.antiCritRate)}% | 命中率 | ${formatFullNumber(d.hitRate)}% |`,
		recoveryEfficiencyRow(d.mpRecoveryEfficiency, d.mentalRecoveryEfficiency),
		`| 闪避率 | ${formatFullNumber(d.dodgeRate)}% | | |`
	].join("\n");
}
function legacyBattlePanelTable(d) {
	return [
		"| 属性 | 数值 | 属性 | 数值 |",
		"| :--- | ---: | :--- | ---: |",
		`| 物理攻击 | ${formatGameAmount(d.physicalAttack)} | 物理防御 | ${formatGameAmount(d.physicalDefense)} |`,
		`| 法术攻击 | ${formatGameAmount(d.magicAttack)} | 法术防御 | ${formatGameAmount(d.magicDefense)} |`,
		`| 生命上限 | ${formatGameAmount(d.hp)} | 速度 | ${formatGameAmount(d.speed)} |`,
		`| 暴击率 | ${formatFullNumber(d.critRate)}% | 暴击伤害 | ${formatFullNumber(d.critDamage)}% |`,
		recoveryEfficiencyRow()
	].join("\n");
}

//#endregion
export { battlePanelTable, formatFullNumber as formatPanelNumber, legacyBattlePanelTable };