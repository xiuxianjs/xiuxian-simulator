export type SkillBookUnequipResult = {
  outcome: 'unequipped' | 'not_in_use';
  skillBook: { name: string | null; skillType: string | null } | null;
};
