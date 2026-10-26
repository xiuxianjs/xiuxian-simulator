export interface MyMarketInstance {
  status: number | null;
  gradeId: number | null;
  washCount: number | null;
  hasUpgraded: number | null;
  physicalAttack: number | null;
  magicAttack: number | null;
  physicalDefense: number | null;
  magicDefense: number | null;
  hp: number | null;
  physicalAttackPercent: number | null;
  magicAttackPercent: number | null;
  physicalDefensePercent: number | null;
  magicDefensePercent: number | null;
  hpPercent: number | null;
  speed: number | null;
  critRate: number | null;
  critDamage: number | null;
  maxPhysicalAttack: number | null;
  maxMagicAttack: number | null;
  maxPhysicalDefense: number | null;
  maxMagicDefense: number | null;
  maxHp: number | null;
  maxPhysicalAttackPercent: number | null;
  maxMagicAttackPercent: number | null;
  maxPhysicalDefensePercent: number | null;
  maxMagicDefensePercent: number | null;
  maxHpPercent: number | null;
  maxSpeed: number | null;
  maxCritRate: number | null;
  maxCritDamage: number | null;
}
export interface MyMarketListing {
  listingId: number;
  itemCategory: string;
  itemCategoryLabel: string;
  itemType: string | null;
  itemSubtype: string | null;
  itemName: string;
  quantity: number;
  unitPriceAmount: number;
  currencyCode: string;
  currencyName: string;
  totalPriceAmount: number;
  lockTag: string;
  createdAt: string | null;
  expiresAt: string | null;
  lockedUntil: string | null;
  status: number;
  attributeAvailable: boolean;
  attributes: MyMarketInstance | null;
  attributeView: { attrText: string | null; hidden: boolean } | null;
}
export interface MyMarketListingPage {
  items: MyMarketListing[];
  pagination: { currentPage: number; totalPages: number; total: number };
}
export interface MarketListingLockRefreshResult {
  expired: number;
  unlocked: number;
}

export function assertMyMarketInstance(value: unknown, message: string): asserts value is MyMarketInstance | null {
  if (value === null) {
    return;
  }
  if (typeof value !== 'object' || !value || Array.isArray(value)) {
    throw new Error(message);
  }
  const attrs = value as Record<string, unknown>;

  if (
    !['status', 'gradeId', 'washCount', 'hasUpgraded'].every(
      key => attrs[key] === null || (typeof attrs[key] === 'number' && Number.isSafeInteger(attrs[key]))
    ) ||
    ![
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
      'critDamage',
      'maxPhysicalAttack',
      'maxMagicAttack',
      'maxPhysicalDefense',
      'maxMagicDefense',
      'maxHp',
      'maxPhysicalAttackPercent',
      'maxMagicAttackPercent',
      'maxPhysicalDefensePercent',
      'maxMagicDefensePercent',
      'maxHpPercent',
      'maxSpeed',
      'maxCritRate',
      'maxCritDamage'
    ].every(key => attrs[key] === null || (typeof attrs[key] === 'number' && Number.isFinite(attrs[key])))
  ) {
    throw new Error(message);
  }
}
