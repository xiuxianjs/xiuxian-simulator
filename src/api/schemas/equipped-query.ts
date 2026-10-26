import type { RecoveryEffect } from './resource-recovery';
export interface EquippedItem {
  id: number;
  equipmentId: number;
  equipment: { id: number; name: string; equipmentTypeId: number; setId: number | null };
}
export interface EquippedSetEffectFacts {
  pieces: number;
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  hp: number;
  speed: number;
  physicalAttackPercent: number;
  magicAttackPercent: number;
  physicalDefensePercent: number;
  magicDefensePercent: number;
  hpPercent: number;
  speedPercent: number;
  critRate: number;
  critDamage: number;
  antiCritRate: number;
  hitRate: number;
  dodgeRate: number;
  normalAttackCritRate: number;
  skillCritRate: number;
  ultimateCritRate: number;
  allSkillCritRate: number;
}
export interface EquippedSetEffect {
  effect: EquippedSetEffectFacts;
  active: boolean;
}
export interface EquippedSlot {
  type: { id: number; name: string };
  item: EquippedItem | null;
}
export interface EquippedQueryData {
  playerName: string | null;
  canUseFifthLayerFeature: boolean;
  types: { id: number; name: string }[];
  items: EquippedItem[];
  slots: EquippedSlot[];
  sets: { id: number; name: string | null; count: number; effects: EquippedSetEffect[]; recoveryEffects?: RecoveryEffect[] }[];
}
