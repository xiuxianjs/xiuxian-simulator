export interface LearnedBookQueryItem {
  id: number;
  name: string | null;
  skillType: string | null;
  damageType: string | null;
  isHidden: number;
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
  maxPhysicalAttack: number;
  maxMagicAttack: number;
  maxPhysicalDefense: number;
  maxMagicDefense: number;
  maxHp: number;
  maxPhysicalAttackPercent: number;
  maxMagicAttackPercent: number;
  maxPhysicalDefensePercent: number;
  maxMagicDefensePercent: number;
  maxHpPercent: number;
  maxSpeed: number;
  maxCritRate: number;
  maxCritDamage: number;
  status: number;
  upgradeCount: number;
  proficiency: number;
}
export type LearnedBookPageItem = Omit<LearnedBookQueryItem, 'name' | 'skillType'> & {
  name: string;
  skillType: string;
  statusText: string;
};
export interface LearnedBooksQueryPage {
  items: LearnedBookPageItem[];
  inUseBooks: LearnedBookPageItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  proficiencyPoints: number;
  canUseFifthLayerFeature: boolean;
}
