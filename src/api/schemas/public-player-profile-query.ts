export interface PublicPlayerProfileQueryData {
  found: boolean;
  hideProfile: boolean;
  profile: { uid: number; name: string; activeTitle: string; realmName: string } | null;
  cave?: {
    relation: 'self' | 'companion' | 'friend' | 'stranger';
    relationLabel: string;
    canViewAura: boolean;
    blockedByFormation: boolean;
    auraText: string;
    auraLevel?: string;
    auraScore?: number;
    activeFormationName?: string;
    summary: string;
  };
  detail?: {
    strength: number;
    intelligence: number;
    constitution: number;
    agility: number;
    luck: number;
    battle: {
      physicalAttack: number;
      physicalDefense: number;
      magicAttack: number;
      magicDefense: number;
      hp: number;
      speed: number;
      critRate: number;
      critDamage: number;
    };
  };
}
