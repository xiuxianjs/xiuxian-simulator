import type { BattlePanelNumbers } from '@src/api/bot/battle-panel-numbers';

export const formatPanelNumber = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 21 }).format;

function recoveryEfficiencyRow(mp = 0, mental = 0) {
  return `| 回灵效率 | ${formatPanelNumber(mp)}% | 回念效率 | ${formatPanelNumber(mental)}% |`;
}

export function battlePanelTable(d: BattlePanelNumbers) {
  return [
    '| 属性 | 数值 | 属性 | 数值 |',
    '| :--- | ---: | :--- | ---: |',
    `| 物理攻击 | ${formatPanelNumber(d.physicalAttack)} | 物理防御 | ${formatPanelNumber(d.physicalDefense)} |`,
    `| 法术攻击 | ${formatPanelNumber(d.magicAttack)} | 法术防御 | ${formatPanelNumber(d.magicDefense)} |`,
    `| 生命上限 | ${formatPanelNumber(d.hp)} | 灵力上限 | ${formatPanelNumber(d.spiritualPower)} |`,
    `| 速度 | ${formatPanelNumber(d.speed)} | 念力上限 | ${formatPanelNumber(d.mentalPower)} |`,
    `| 暴击率 | ${formatPanelNumber(d.critRate)}% | 暴击伤害 | ${formatPanelNumber(d.critDamage)}% |`,
    `| 抗暴率 | ${formatPanelNumber(d.antiCritRate)}% | 命中率 | ${formatPanelNumber(d.hitRate)}% |`,
    recoveryEfficiencyRow(d.mpRecoveryEfficiency, d.mentalRecoveryEfficiency),
    `| 闪避率 | ${formatPanelNumber(d.dodgeRate)}% | | |`
  ].join('\n');
}

export function legacyBattlePanelTable(
  d: Pick<BattlePanelNumbers, 'physicalAttack' | 'physicalDefense' | 'magicAttack' | 'magicDefense' | 'hp' | 'speed' | 'critRate' | 'critDamage'>
) {
  return [
    '| 属性 | 数值 | 属性 | 数值 |',
    '| :--- | ---: | :--- | ---: |',
    `| 物理攻击 | ${formatPanelNumber(d.physicalAttack)} | 物理防御 | ${formatPanelNumber(d.physicalDefense)} |`,
    `| 法术攻击 | ${formatPanelNumber(d.magicAttack)} | 法术防御 | ${formatPanelNumber(d.magicDefense)} |`,
    `| 生命上限 | ${formatPanelNumber(d.hp)} | 速度 | ${formatPanelNumber(d.speed)} |`,
    `| 暴击率 | ${formatPanelNumber(d.critRate)}% | 暴击伤害 | ${formatPanelNumber(d.critDamage)}% |`,
    recoveryEfficiencyRow()
  ].join('\n');
}
