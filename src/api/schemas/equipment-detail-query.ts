import type { RecoveryEffect } from './resource-recovery';
export interface EquipmentDetailItemData {
  crafterName?: string | null;
  recoveryEffects?: RecoveryEffect[];
  id: number;
  isLocked: number;
  name: string;
  gradeName: string | null;
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
  critRate: number;
  critDamage: number;
  antiCritRate: number;
  hitRate: number;
  dodgeRate: number;
}
export interface EquipmentDetailQueryData {
  playerName: string | null;
  item: EquipmentDetailItemData | null;
}
