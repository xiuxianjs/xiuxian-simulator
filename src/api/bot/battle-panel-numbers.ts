export const battlePanelKeys = [
  'combatPower',
  'physicalAttack',
  'physicalDefense',
  'magicAttack',
  'magicDefense',
  'hp',
  'spiritualPower',
  'mentalPower',
  'speed',
  'critRate',
  'critDamage',
  'antiCritRate',
  'hitRate',
  'dodgeRate'
] as const;

export type BattlePanelNumbers = Record<(typeof battlePanelKeys)[number], number> & {
  mpRecoveryEfficiency?: number;
  mentalRecoveryEfficiency?: number;
};

export function parseBattlePanelNumbers(data: Record<string, unknown>): BattlePanelNumbers {
  for (const key of battlePanelKeys) {
    if (typeof data[key] !== 'number' || !Number.isSafeInteger(data[key])) {
      throw new Error('查看信息战斗数值不完整');
    }
  }
  for (const key of ['mpRecoveryEfficiency', 'mentalRecoveryEfficiency'] as const) {
    const number = data[key];

    if (number !== undefined && (typeof number !== 'number' || !Number.isFinite(number))) {
      throw new Error('查看信息回复效率无效');
    }
  }

  return data as BattlePanelNumbers;
}
