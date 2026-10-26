import { requestBackend } from './client';

export type TianshuContent = {
  gateVersion?: number;
  commandFeatures?: Record<string, string>;
  featureCatalog?: Array<{ stageLevel: number; stageName: string; features: TianshuFeature[] }>;
  intro: string;
  realmUnlocks: Array<{ realm: string; features: string[] }>;
  notes: string[];
  currentStage?: TianshuStage;
  nextStage?: TianshuStage;
};

export type TianshuFeature = {
  id: string;
  name: string;
  description: string;
  realm: string;
  realmReached: boolean;
  visible: boolean;
  conditions: string[];
};

export type TianshuStage = {
  stageLevel: number;
  stageName: string;
  realmName?: string;
  unlocks: Array<{ realm: string; features: string[]; unlocked?: boolean }>;
};

const isStage = (value: unknown): value is TianshuStage => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const stage = value as Record<string, unknown>;

  return (
    Number.isInteger(stage.stageLevel) &&
    Number(stage.stageLevel) >= 0 &&
    typeof stage.stageName === 'string' &&
    (stage.realmName === undefined || typeof stage.realmName === 'string') &&
    Array.isArray(stage.unlocks) &&
    stage.unlocks.every(
      row => row &&
        typeof row === 'object' &&
        typeof row.realm === 'string' &&
        Array.isArray(row.features) &&
        row.features.every((feature: unknown) => typeof feature === 'string') &&
        (row.unlocked === undefined || typeof row.unlocked === 'boolean')
    )
  );
};

export async function getBackendTianshuContent(bid: string | undefined): Promise<TianshuContent> {
  if (!bid) {
    throw new Error('天书查询缺少平台身份');
  }

  return parseBackendTianshuContent(await requestBackend(bid, 'get_content_tianshu'));
}

export function parseBackendTianshuContent(data: unknown): TianshuContent {
  if (!data || typeof data !== 'object') {
    throw new Error('天书接口数据不完整');
  }

  const content = data as Record<string, unknown>;

  if (
    (content.gateVersion !== undefined && content.gateVersion !== 1) ||
    (content.commandFeatures !== undefined &&
      (!content.commandFeatures ||
        typeof content.commandFeatures !== 'object' ||
        Array.isArray(content.commandFeatures) ||
        !Object.entries(content.commandFeatures).every(([key, value]) => key.trim() !== '' && typeof value === 'string' && value !== ''))) ||
    (content.featureCatalog !== undefined &&
      (!Array.isArray(content.featureCatalog) ||
        !content.featureCatalog.every(
          group => group &&
            Number.isInteger(group.stageLevel) &&
            group.stageLevel >= 0 &&
            typeof group.stageName === 'string' &&
            Array.isArray(group.features) &&
            group.features.every(
              (feature: TianshuFeature) => feature &&
                typeof feature.id === 'string' &&
                typeof feature.name === 'string' &&
                typeof feature.description === 'string' &&
                typeof feature.realm === 'string' &&
                typeof feature.realmReached === 'boolean' &&
                typeof feature.visible === 'boolean' &&
                Array.isArray(feature.conditions) &&
                feature.conditions.every(condition => typeof condition === 'string')
            )
        ))) ||
    typeof content.intro !== 'string' ||
    !Array.isArray(content.realmUnlocks) ||
    !content.realmUnlocks.every(
      row => row &&
        typeof row === 'object' &&
        typeof row.realm === 'string' &&
        Array.isArray(row.features) &&
        row.features.every((feature: unknown) => typeof feature === 'string')
    ) ||
    !Array.isArray(content.notes) ||
    !content.notes.every(note => typeof note === 'string') ||
    (content.currentStage !== undefined && !isStage(content.currentStage)) ||
    (content.nextStage !== undefined && !isStage(content.nextStage))
  ) {
    throw new Error('天书接口数据不完整');
  }

  return content as TianshuContent;
}

export type FeatureAccess = { realmReached: boolean; requiredRealm: string; lockedReason: string };
export function parseFeatureAccess(value: unknown): Record<string, FeatureAccess> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('功能开放条件不完整');
  }
  const out: Record<string, FeatureAccess> = {};

  for (const [key, raw] of Object.entries(value)) {
    const row = raw as FeatureAccess | null;

    if (!row || typeof row.realmReached !== 'boolean' || typeof row.requiredRealm !== 'string' || typeof row.lockedReason !== 'string') {
      throw new Error('功能开放条件不完整');
    }
    out[key] = row;
  }

  return out;
}

/** Compact, server-evaluated state; static command rules are loaded at startup. */
export async function getBackendPresentationAccess(bid: string): Promise<Record<string, boolean>> {
  const raw = await requestBackend(bid, 'get_content_tianshu', { query: { view: 'access' } });

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>;

    if (
      value.gateVersion === 1 &&
      value.features &&
      typeof value.features === 'object' &&
      !Array.isArray(value.features) &&
      Object.values(value.features).every(reached => typeof reached === 'boolean')
    ) {
      return value.features as Record<string, boolean>;
    }
  }
  // Compatible with servers that still return the complete catalogue for this read.
  const content = parseBackendTianshuContent(raw);

  if (content.gateVersion !== 1 || !content.featureCatalog) {
    throw new Error('功能状态不完整');
  }

  return Object.fromEntries(content.featureCatalog.flatMap(group => group.features.map(feature => [feature.id, feature.realmReached && feature.visible])));
}
