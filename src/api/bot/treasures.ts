import { BackendAPIError } from './client';

function invalid(): never {
  throw new BackendAPIError('宝物业务响应不完整', 'SDK_INVALID_RESPONSE');
}
function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid();
  }

  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    return invalid();
  }

  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return invalid();
  }

  return value;
}
function integer(value: unknown): number {
  const result = number(value);

  if (!Number.isSafeInteger(result)) {
    return invalid();
  }

  return result;
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    return invalid();
  }

  return value;
}
function array<T>(value: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    return invalid();
  }

  return value.map(parse);
}
function date(value: unknown): string {
  const result = text(value);

  if (!Number.isFinite(Date.parse(result))) {
    return invalid();
  }

  return result;
}
function nullableDate(value: unknown): string | null {
  return value === null ? null : date(value);
}
export const treasureAttributeNames = {
  physicalAttack: '物攻',
  magicAttack: '法攻',
  physicalDefense: '物防',
  magicDefense: '法防',
  hp: '生命'
} as const;
function attributes(value: unknown) {
  const item = row(value);

  return {
    physicalAttack: number(item.physicalAttack),
    magicAttack: number(item.magicAttack),
    physicalDefense: number(item.physicalDefense),
    magicDefense: number(item.magicDefense),
    hp: number(item.hp)
  };
}
function rarity(value: unknown): number {
  const result = integer(value);

  if (result < 1 || result > 6) {
    return invalid();
  }

  return result;
}
function definition(value: unknown) {
  const item = row(value);

  return {
    id: integer(item.id),
    name: text(item.name),
    rarity: rarity(item.rarity),
    rarityName: text(item.rarityName),
    baseAttributes: attributes(item.baseAttributes),
    perLevelAttributes: attributes(item.perLevelAttributes),
    basePercentAttributes: attributes(item.basePercentAttributes),
    effectDescription: text(item.effectDescription),
    stageValues: array(item.stageValues, text),
    maxGrade: integer(item.maxGrade),
    weight: number(item.weight)
  };
}
function promotion(value: unknown) {
  if (value === null) {
    return null;
  }
  const item = row(value);

  return { duplicates: integer(item.duplicates), xianYun: integer(item.xianYun), requirements: array(item.requirements, text) };
}
function ownedTreasure(value: unknown) {
  const item = row(value);

  return {
    definition: definition(item.definition),
    owned: bool(item.owned),
    grade: integer(item.grade),
    gradeName: text(item.gradeName),
    level: integer(item.level),
    fragments: integer(item.fragments),
    duplicates: integer(item.duplicates),
    attributes: attributes(item.attributes),
    percentAttributes: attributes(item.percentAttributes),
    currentEffect: text(item.currentEffect),
    nextLevelCost: integer(item.nextLevelCost),
    promotion: promotion(item.promotion),
    canUpgrade: bool(item.canUpgrade),
    canPromote: bool(item.canPromote)
  };
}
function fortune(value: unknown) {
  const item = row(value);
  const bonus = row(item.bonus);

  return {
    score: number(item.score),
    level: integer(item.level),
    maxLevel: integer(item.maxLevel),
    nextThreshold: item.nextThreshold === null ? null : number(item.nextThreshold),
    bonus: { critRate: number(bonus.critRate), critDamage: number(bonus.critDamage), hitRate: number(bonus.hitRate), dodgeRate: number(bonus.dodgeRate) }
  };
}
export function parseTreasureOverview(value: unknown) {
  const item = row(value);

  return {
    items: array(item.items, ownedTreasure),
    experience: integer(item.experience),
    xianYun: integer(item.xianYun),
    levelCap: integer(item.levelCap),
    fortune: fortune(item.fortune),
    version: integer(item.version),
    decompositionValues: array(item.decompositionValues, value => {
      const v = row(value);

      return { rarity: rarity(v.rarity), bodyXianYun: integer(v.bodyXianYun), fragmentXianYun: integer(v.fragmentXianYun) };
    }),
    records: array(item.records, value => {
      const v = row(value);

      return { operationId: text(v.operationId), kind: text(v.kind), createdAt: date(v.createdAt), message: text(v.message) };
    })
  };
}
export type TreasureOverview = ReturnType<typeof parseTreasureOverview>;
export type OwnedTreasure = TreasureOverview['items'][number];
export function parseTreasureCatalog(value: unknown) {
  return array(value, definition);
}
const sources = ['free', 'spirit_crystal', 'dao_crystal', 'treasure_map'] as const;

function source(value: unknown): (typeof sources)[number] {
  if (!sources.includes(value as (typeof sources)[number])) {
    return invalid();
  }

  return value as (typeof sources)[number];
}
function reward(value: unknown) {
  const item = row(value);

  if (!['fragment', 'body'].includes(String(item.kind))) {
    return invalid();
  }
  const autoSynthesized = item.autoSynthesized === undefined ? 0 : integer(item.autoSynthesized);
  const fragmentsRemaining = item.fragmentsRemaining === undefined ? undefined : integer(item.fragmentsRemaining);

  if (fragmentsRemaining !== undefined && fragmentsRemaining > 9) { return invalid(); }

  return {
    treasureId: integer(item.treasureId),
    name: text(item.name),
    rarity: rarity(item.rarity),
    kind: text(item.kind),
    quantity: integer(item.quantity),
    newlyOwned: bool(item.newlyOwned),
    autoSynthesized,
    fragmentsRemaining,
    forcedComplete: item.forcedComplete === undefined ? false : bool(item.forcedComplete)
  };
}
export function parseRelicsOverview(value: unknown) {
  const item = row(value);
  const balances = row(item.balances);
  const shape = row(item.shapeRates);

  return {
    serverDate: date(item.serverDate),
    balances: { spiritCrystal: integer(balances.spiritCrystal), daoCrystal: integer(balances.daoCrystal), treasureMaps: integer(balances.treasureMaps) },
    freeAvailable: bool(item.freeAvailable),
    spiritTenDiscountAvailable: bool(item.spiritTenDiscountAvailable),
    totalExplorations: integer(item.totalExplorations),
    milestoneProgress: integer(item.milestoneProgress),
    pendingSelections: integer(item.pendingSelections),
    shapeRates: {
      singleComplete: number(shape.singleComplete),
      tenExpectedComplete: number(shape.tenExpectedComplete),
      tenAverageComplete: number(shape.tenAverageComplete)
    },
    pity: array(item.pity, value => {
      const p = row(value);

      return {
        rarity: rarity(p.rarity),
        name: text(p.name),
        counter: integer(p.counter),
        hardPity: integer(p.hardPity),
        nextProbability: number(p.nextProbability)
      };
    }),
    wholeRates: array(item.wholeRates, value => {
      const p = row(value);

      return { rarity: rarity(p.rarity), name: text(p.name), probability: number(p.probability) };
    }),
    rules: array(item.rules, text),
    records: array(item.records, value => {
      const record = row(value);

      return {
        operationId: text(record.operationId),
        createdAt: date(record.createdAt),
        source: source(record.source),
        count: integer(record.count),
        paidAmount: integer(record.paidAmount),
        rewards: array(record.rewards, reward)
      };
    })
  };
}
export function parseSpiritVein(value: unknown) {
  const item = row(value);

  return {
    active: bool(item.active),
    startDate: nullableDate(item.startDate),
    endDate: nullableDate(item.endDate),
    remainingDays: integer(item.remainingDays),
    claimableDays: integer(item.claimableDays),
    claimableCrystal: integer(item.claimableCrystal),
    maxDays: integer(item.maxDays),
    packageId: item.packageId === null ? null : integer(item.packageId),
    priceAmount: integer(item.priceAmount),
    dailyCrystal: integer(item.dailyCrystal),
    immediateDaoCrystal: integer(item.immediateDaoCrystal),
    canPurchase: bool(item.canPurchase),
    purchaseUnavailableReason: item.purchaseUnavailableReason === undefined ? undefined : text(item.purchaseUnavailableReason)
  };
}
const kinds = ['explore', 'synthesize', 'upgrade', 'promote', 'select-mythic', 'claimLease', 'decompose'] as const;

export type TreasurePreviewKind = (typeof kinds)[number];
export function validTreasureConfirmationRef(value: string): boolean {
  return /^r1_[0-9a-z]{1,13}_b_[0-9a-z]{1,13}_[0-9a-f]{24}$/.test(value) && [...`/确认宝物 ${value}`].length <= 80;
}
export function parseTreasureConfirmation(value: unknown) {
  const item = row(value);

  if (!kinds.includes(item.kind as TreasurePreviewKind)) {
    return invalid();
  }
  const confirmationRef = text(item.confirmationRef);

  if (!validTreasureConfirmationRef(confirmationRef)) {
    return invalid();
  }

  return {
    kind: item.kind as TreasurePreviewKind,
    summary: array(item.summary, text),
    confirmationRef,
    expiresAt: date(item.expiresAt),
    operationId: text(item.operationId)
  };
}
export function parseTreasureReceipt(value: unknown) {
  const item = row(value);

  if (!kinds.includes(item.kind as TreasurePreviewKind)) {
    return invalid();
  }
  const result = row(item.result);

  if (result.operationId !== item.operationId) {
    return invalid();
  }
  if (item.kind === 'explore' && (!Array.isArray(result.rewards) || result.rewards.length < integer(result.count))) { return invalid(); }
  if (item.kind === 'explore') {
    const count = integer(result.count);

    if (![1, 10].includes(count)) { return invalid(); }
    if (result.rulesVersion === 'treasure-v3-complete-20261027') {
      if ((result.rewards as unknown[]).length !== count || result.experienceGranted !== count * 100) { return invalid(); }
    } else if (!['treasure-v1-20261027', 'treasure-v2-20261027-first-drop'].includes(String(result.rulesVersion))) { return invalid(); }
  }

  return {
    kind: item.kind as TreasurePreviewKind,
    operationId: text(item.operationId),
    result: {
      operationId: text(result.operationId),
      message: text(result.message),
      ...(item.kind === 'explore'
        ? {
            rewards: array(result.rewards, reward),
            rulesVersion: text(result.rulesVersion),
            source: source(result.source),
            count: integer(result.count),
            paidAmount: integer(result.paidAmount),
            experienceGranted: integer(result.experienceGranted)
          }
        : {}),
      ...(item.kind === 'claimLease' ? { days: integer(result.days), spiritCrystal: integer(result.spiritCrystal) } : {})
    }
  };
}

export function parseTreasureDailyPacks(value: unknown) {
  const data = row(value);

  return {
    serverDate: date(data.serverDate),
    unresolvedOrderNo: data.unresolvedOrderNo === null ? null : text(data.unresolvedOrderNo),
    quotas: array(data.quotas, value => {
      const q = row(value);

      return { sku: text(q.sku), limit: integer(q.limit), successful: integer(q.successful), pending: integer(q.pending), remaining: integer(q.remaining) };
    }),
    products: array(data.products, value => {
      const p = row(value);

      return {
        sku: text(p.sku),
        name: text(p.name),
        packageId: p.packageId === null ? null : integer(p.packageId),
        priceAmount: integer(p.priceAmount),
        limit: integer(p.limit),
        remaining: integer(p.remaining),
        available: bool(p.available),
        unavailableReason: text(p.unavailableReason),
        label: text(p.label),
        promotionTexts: array(p.promotionTexts, text),
        rewardParts: array(p.rewardParts, value => {
          const r = row(value);

          return {
            kind: text(r.kind),
            name: text(r.name),
            quantity: integer(r.quantity),
            independentRolls: r.independentRolls === undefined ? undefined : integer(r.independentRolls),
            perRoll: r.perRoll === undefined ? undefined : integer(r.perRoll)
          };
        })
      };
    })
  };
}
