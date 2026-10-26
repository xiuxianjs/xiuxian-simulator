import type { SkillBookMaximum } from './skill-book-switch';

const maximumKeys: Array<keyof SkillBookMaximum> = [
  'physicalAttack',
  'magicAttack',
  'physicalDefense',
  'magicDefense',
  'hp',
  'physicalAttackPercent',
  'magicAttackPercent',
  'physicalDefensePercent',
  'magicDefensePercent',
  'hpPercent',
  'speed',
  'critRate',
  'critDamage'
];

export function parseSkillBookMaximum(value: unknown): SkillBookMaximum | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;

  if (maximumKeys.some(key => typeof row[key] !== 'number' || !Number.isFinite(row[key]))) {
    return undefined;
  }

  return Object.fromEntries(maximumKeys.map(key => [key, row[key]])) as SkillBookMaximum;
}
