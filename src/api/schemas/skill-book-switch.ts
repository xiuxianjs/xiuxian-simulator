export type SkillBookMaximum = {
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  hp: number;
  physicalAttackPercent: number;
  magicAttackPercent: number;
  physicalDefensePercent: number;
  magicDefensePercent: number;
  hpPercent: number;
  speed: number;
  critRate: number;
  critDamage: number;
};

export type SkillBookSwitchSummary = {
  id: number;
  name: string;
  skillType: '战技' | '被动技' | '神通';
};

export type SkillBookSwitchResponse = {
  outcome: 'switched' | 'confirmation_required';
  skillBook: SkillBookSwitchSummary;
  oldSkillBook?: SkillBookSwitchSummary;
  targetMaximum?: SkillBookMaximum;
  oldMaximum?: SkillBookMaximum;
  comparisonLines?: string[];
  confirmationMessage?: string;
};
