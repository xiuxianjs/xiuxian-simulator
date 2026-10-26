import type { RecoveryEffect } from './resource-recovery';
export type SoulArtifactOverviewCapabilityKind = 'refine' | 'gradeUpgrade' | 'upgradeLevel' | 'wash' | 'unequip' | 'lock' | 'unlock';

/** A server-authorized entry point for one soul artifact instance. */
export interface SoulArtifactOverviewCapability {
  kind: SoulArtifactOverviewCapabilityKind;
  available: boolean;
  reasonCode?: string;
  instanceId: number;
  maxLevels?: number;
  requiredItemId?: number;
  requiredQuantity?: number;
  availableQuantity?: number;
}

/** A server-authorized entry point for the complete soul-artifact overview. */
export interface SoulArtifactOverviewPageCapability {
  kind: 'soulPath';
  available: boolean;
  reasonCode?: string;
}

export interface SoulOverviewItem {
  recoveryEffects?: RecoveryEffect[];
  instanceId: number;
  artifactId: number;
  name: string;
  category: string;
  positioning: string;
  gradeId: number;
  level: number;
  washCount: number;
  hasUpgraded: boolean;
  isEquipped: boolean;
  lockStatus: number;
  statusText: string;
  washQuality: 'normal' | 'good' | 'fine' | 'excellent';
  maxAffixCount: number;
  basePanels: { key: string; value: number }[];
  combatPanels?: { key: string; name: string; value: number }[];
  panels: { key: string; washBonus: number; washCap: number; affixType: 'main' | 'sub' | 'off' }[];
  capabilities: SoulArtifactOverviewCapability[];
}
export interface SoulArtifactOverviewQuery {
  hasDisplayItems?: boolean;
  items: SoulOverviewItem[];
  realmLevel: number | null;
  realmStageLevel: number;
  equippedInstanceId: number | null;
  capabilities: SoulArtifactOverviewPageCapability[];
}
