/** Projection shared by counter-attack and bounty receipts from Go battle.Unit. */
export type NamedBattleUnit = { name: string; hp: number; maxHp: number; isDead: boolean };

export function parseNamedBattleUnit(value: unknown, errorMessage: string): NamedBattleUnit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(errorMessage);
  }
  const unit = value as Record<string, unknown>;
  const name = unit.Name === undefined ? unit.name : unit.Name;
  const hp = unit.HP === undefined ? unit.hp : unit.HP;
  const maxHp = unit.MaxHP === undefined ? unit.maxHp : unit.MaxHP;
  const dead = unit.Dead === undefined ? unit.dead : unit.Dead;

  if (
    typeof name !== 'string' ||
    typeof hp !== 'number' ||
    !Number.isSafeInteger(hp) ||
    typeof maxHp !== 'number' ||
    !Number.isSafeInteger(maxHp) ||
    typeof dead !== 'boolean'
  ) {
    throw new Error(errorMessage);
  }

  return { name, hp, maxHp, isDead: dead || hp <= 0 };
}
