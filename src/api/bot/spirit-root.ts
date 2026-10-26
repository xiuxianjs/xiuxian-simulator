type Row = Record<string, unknown>;
const row = (value: unknown): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('灵根响应不完整');
  }

  return value as Row;
};
const number = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('灵根数值不完整');
  }

  return value;
};
const text = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error('灵根文案不完整');
  }

  return value;
};
const bool = (value: unknown): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error('灵根状态不完整');
  }

  return value;
};

export type SpiritRootView = {
  granted: boolean;
  title: string;
  quality: number;
  qualityName: string;
  cultivation: number;
  stagePoints: number;
  stageTarget: number;
  overflow: number;
  bonusPercent: number;
  nextBonusPercent: number;
  nextQualityName: string;
  requiredRealmName: string;
  canFeed: boolean;
  canPromote: boolean;
  meditationActive: boolean;
  activeMeditationBonusPercent: number;
  message: string;
};
export function parseSpiritRoot(value: unknown): SpiritRootView {
  const v = row(value);

  return {
    granted: bool(v.granted),
    title: text(v.title),
    quality: number(v.quality),
    qualityName: text(v.qualityName),
    cultivation: number(v.cultivation),
    stagePoints: number(v.stagePoints),
    stageTarget: number(v.stageTarget),
    overflow: number(v.overflow),
    bonusPercent: number(v.bonusPercent),
    nextBonusPercent: number(v.nextBonusPercent),
    nextQualityName: text(v.nextQualityName),
    requiredRealmName: text(v.requiredRealmName),
    canFeed: bool(v.canFeed),
    canPromote: bool(v.canPromote),
    meditationActive: bool(v.meditationActive),
    activeMeditationBonusPercent: number(v.activeMeditationBonusPercent),
    message: text(v.message)
  };
}
export type SpiritRootSource = { dungeonId: number; name: string; realmLimit: string };
const sources = (value: unknown): SpiritRootSource[] => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('灵药来源条件不完整');
  }

  return value.map(input => {
    const v = row(input);

    return { dungeonId: number(v.dungeonId), name: text(v.name), realmLimit: text(v.realmLimit) };
  });
};

export type SpiritRootMaterial = {
  itemId: number;
  name: string;
  points: number;
  quantity: number;
  locked: boolean;
  seedName: string;
  sources: string[];
  sourceDetails: SpiritRootSource[];
  seedAvailable?: boolean;
  seedSources: SpiritRootSource[];
};
export function parseSpiritRootMaterials(value: unknown): SpiritRootMaterial[] {
  if (!Array.isArray(value)) {
    throw new Error('灵药列表不完整');
  }

  return value.map(input => {
    const v = row(input);

    if (!Array.isArray(v.sources)) {
      throw new Error('灵药来源不完整');
    }

    return {
      itemId: number(v.itemId),
      name: text(v.name),
      points: number(v.points),
      quantity: number(v.quantity),
      locked: bool(v.locked),
      seedName: text(v.seedName),
      sources: v.sources.map(text),
      sourceDetails: sources(v.sourceDetails),
      seedSources: sources(v.seedSources),
      seedAvailable: v.seedAvailable === undefined ? undefined : bool(v.seedAvailable)
    };
  });
}
export type SpiritRootPreview = {
  itemId: number;
  itemName: string;
  requested: number;
  consumed: number;
  pointsAdded: number;
  before: number;
  after: number;
  quality: number;
  stageTarget: number;
  stageBefore: number;
  stageAfter: number;
};
export function parseSpiritRootPreview(value: unknown): SpiritRootPreview {
  const v = row(value);

  return {
    itemId: number(v.itemId),
    itemName: text(v.itemName),
    requested: number(v.requested),
    consumed: number(v.consumed),
    pointsAdded: number(v.pointsAdded),
    before: number(v.before),
    after: number(v.after),
    quality: number(v.quality),
    stageTarget: number(v.stageTarget),
    stageBefore: number(v.stageBefore),
    stageAfter: number(v.stageAfter)
  };
}
export function parseSpiritRootMutation(value: unknown): { view: SpiritRootView; message: string } {
  const v = row(value);

  return { view: parseSpiritRoot(v.view), message: text(v.message) };
}
