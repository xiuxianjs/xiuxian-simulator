import { parseRecoveryEffects, type RecoveryEffect } from '../schemas/resource-recovery';
import { requestBackend } from './client';
import type {
  SoulArtifactOverviewCapability,
  SoulArtifactOverviewCapabilityKind,
  SoulArtifactOverviewPageCapability
} from '../schemas/soul-artifact-overview-query';

type SoulArtifactOverviewKey = 'patk' | 'matk' | 'pdef' | 'mdef' | 'hp' | 'speed' | 'critRate' | 'hitRate' | 'dodgeRate' | 'antiCritRate' | 'critDmgRate';

export type SoulArtifactOverviewDisplayItem = {
  recoveryEffects?: RecoveryEffect[];
  instanceId: number;
  artifactId: number;
  name: string;
  category: string;
  positioning: string;
  gradeId: number;
  gradeName: string;
  level: number;
  washCount: number;
  hasUpgraded: boolean;
  isEquipped: boolean;
  lockStatus: number;
  statusText: string;
  washQuality: string;
  revealedAffixCount: number;
  maxAffixCount: number;
  capabilities: SoulArtifactOverviewCapability[];
  basePanels: Array<{ key: SoulArtifactOverviewKey; name: string; value: number }>;
  combatPanels?: Array<{ key: SoulArtifactOverviewKey; name: string; value: number }>;
  panels: Array<{
    key: SoulArtifactOverviewKey;
    name: string;
    washBonus: number;
    washCap: number;
    affixType: 'main' | 'sub' | 'off';
    affixTypeName: string;
    isPercent: boolean;
  }>;
};

function fixedPanels(value: unknown) {
  return rows(value).map(panel => {
    const stat = key(panel.key);

    if (!['patk', 'matk', 'pdef', 'mdef', 'hp', 'speed'].includes(stat)) {
      throw new Error('本命物基础属性无效');
    }

    return { key: stat, name: text(panel.name), value: number(panel.value) };
  });
}

const capabilityKinds = new Set<SoulArtifactOverviewCapabilityKind>(['refine', 'gradeUpgrade', 'upgradeLevel', 'wash', 'unequip', 'lock', 'unlock']);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('本命物查询返回格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('本命物查询缺少数值字段');
  }

  return value;
}
function integer(value: unknown): number {
  const result = number(value);

  if (!Number.isSafeInteger(result)) {
    throw new Error('本命物查询整数字段无效');
  }

  return result;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('本命物查询缺少文本字段');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('本命物查询缺少状态字段');
  }

  return value;
}
function rows(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('本命物查询缺少列表');
  }

  return value.map(record);
}
function optionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return text(value);
}
function optionalNonNegativeInteger(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const result = number(value);

  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`本命物能力字段 ${field} 无效`);
  }

  return result;
}
function capability(value: unknown): SoulArtifactOverviewCapability {
  const source = record(value);
  const kind = text(source.kind);

  if (!capabilityKinds.has(kind as SoulArtifactOverviewCapabilityKind)) {
    throw new Error('本命物操作能力无效');
  }
  const instanceId = number(source.instanceId);

  if (!Number.isSafeInteger(instanceId) || instanceId <= 0) {
    throw new Error('本命物操作能力缺少实例');
  }
  const reasonCode = optionalText(source.reasonCode);
  const result: SoulArtifactOverviewCapability = {
    kind: kind as SoulArtifactOverviewCapabilityKind,
    available: boolean(source.available),
    instanceId,
    ...(reasonCode === undefined ? {} : { reasonCode })
  };

  for (const [field, value] of Object.entries({
    maxLevels: source.maxLevels,
    requiredItemId: source.requiredItemId,
    requiredQuantity: source.requiredQuantity,
    availableQuantity: source.availableQuantity
  })) {
    const parsed = optionalNonNegativeInteger(value, field);

    if (parsed !== undefined) {
      result[field as 'maxLevels' | 'requiredItemId' | 'requiredQuantity' | 'availableQuantity'] = parsed;
    }
  }

  const needsLevelParameters = result.available && (result.kind === 'upgradeLevel' || result.kind === 'wash');
  const missingLevelParameters =
    result.maxLevels === undefined || result.requiredItemId === undefined || result.requiredQuantity === undefined || result.availableQuantity === undefined;

  if (needsLevelParameters && missingLevelParameters) {
    throw new Error(`本命物${result.kind === 'upgradeLevel' ? '升级' : '洗涤'}能力字段不完整`);
  }
  if (result.available && result.kind === 'gradeUpgrade' && (result.requiredQuantity === undefined || result.availableQuantity === undefined)) {
    throw new Error('本命物升品能力字段不完整');
  }

  return result;
}
function pageCapability(value: unknown): SoulArtifactOverviewPageCapability {
  const source = record(value);

  if (text(source.kind) !== 'soulPath') {
    throw new Error('本命物页面能力无效');
  }
  const reasonCode = optionalText(source.reasonCode);

  return { kind: 'soulPath', available: boolean(source.available), ...(reasonCode === undefined ? {} : { reasonCode }) };
}
function key(value: unknown): SoulArtifactOverviewKey {
  const result = text(value);
  const keys = new Set<SoulArtifactOverviewKey>([
    'patk',
    'matk',
    'pdef',
    'mdef',
    'hp',
    'speed',
    'critRate',
    'hitRate',
    'dodgeRate',
    'antiCritRate',
    'critDmgRate'
  ]);

  if (!keys.has(result as SoulArtifactOverviewKey)) {
    throw new Error('本命物属性无效');
  }

  return result as SoulArtifactOverviewKey;
}
export async function getBackendSoulArtifactOverview(bid: string | undefined, uid: number, view?: 'equipped') {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseSoulArtifactOverview(
    await requestBackend(bid, 'get_players_id_soul_artifacts_overview', { path: { id: uid }, ...(view ? { query: { view } } : {}) }),
    view
  );
}

export function parseSoulArtifactOverview(value: unknown, view?: 'equipped') {
  const data = record(value);
  const items: SoulArtifactOverviewDisplayItem[] = rows(data.items).map(row => {
    const panels = rows(row.panels).map(panel => {
      const stat = key(panel.key);
      const relation = text(panel.affixType);

      if (!['main', 'sub', 'off'].includes(relation)) {
        throw new Error('本命物词条关系无效');
      }

      return {
        key: stat,
        name: text(panel.name),
        washBonus: number(panel.washBonus),
        washCap: number(panel.washCap),
        affixType: relation as 'main' | 'sub' | 'off',
        affixTypeName: text(panel.affixTypeName),
        isPercent: boolean(panel.isPercent)
      };
    });
    const quality = text(row.washQuality);

    if (!['normal', 'good', 'fine', 'excellent'].includes(quality)) {
      throw new Error('本命物洗涤品质无效');
    }
    const gradeId = integer(row.gradeId);
    const lockStatus = integer(row.lockStatus);

    return {
      recoveryEffects: parseRecoveryEffects(row.recoveryEffects),
      instanceId: integer(row.instanceId),
      artifactId: integer(row.artifactId),
      name: text(row.name),
      category: text(row.category),
      positioning: text(row.positioning),
      gradeId,
      gradeName: text(row.gradeName),
      level: integer(row.level),
      washCount: integer(row.washCount),
      hasUpgraded: boolean(row.hasUpgraded),
      isEquipped: boolean(row.isEquipped),
      lockStatus,
      statusText: text(row.statusText),
      isListed: lockStatus === 2,
      washQuality: text(row.washQualityText),
      revealedAffixCount: panels.length,
      maxAffixCount: integer(row.maxAffixCount),
      capabilities: rows(row.capabilities).map(capability),
      panels,
      basePanels: fixedPanels(row.basePanels),
      ...(row.combatPanels === undefined ? {} : { combatPanels: fixedPanels(row.combatPanels) })
    };
  });

  const equippedInstanceId = data.equippedInstanceId === null ? null : number(data.equippedInstanceId);

  if (equippedInstanceId !== null && (!Number.isSafeInteger(equippedInstanceId) || equippedInstanceId <= 0)) {
    throw new Error('本命物当前炼化实例无效');
  }

  // Older services ignore view and return full items without this metadata.
  const hasDisplayItems = view === 'equipped' && data.hasDisplayItems !== undefined ? boolean(data.hasDisplayItems) : undefined;

  return {
    items,
    ...(view === 'equipped' ? { hasDisplayItems: hasDisplayItems ?? items.length > 0 } : {}),
    maxLevel: data.realmLevel === null ? 36 : integer(data.realmLevel),
    equippedInstanceId,
    capabilities: rows(data.capabilities).map(pageCapability)
  };
}

export function parseRobotSoulDetail(value: unknown): SoulArtifactOverviewDisplayItem & { maxLevel: number } {
  const out = record(value);

  if (out.mode !== 'detail') {
    throw new Error('本命物查询返回格式不完整');
  }
  const facts = parseSoulArtifactOverview(out.overview);

  if (facts.items.length !== 1) {
    throw new Error('本命物查询返回格式不完整');
  }

  return { ...facts.items[0], maxLevel: facts.maxLevel };
}

export function parseRobotSoulInfo(value: unknown) {
  const out = record(value);
  const facts = parseSoulArtifactOverview(out.overview, 'equipped');

  if (out.mode === 'empty' && !facts.hasDisplayItems) {
    return { code: 'EMPTY' as const, data: { message: '你还没有本命物，可在 积分商店 或 珍宝楼 购买' } };
  }
  const artifact = facts.items.find(item => item.instanceId === facts.equippedInstanceId);

  if (out.mode === 'not_equipped' && facts.hasDisplayItems && !artifact) {
    return { code: 'NOT_EQUIPPED' as const, capabilities: facts.capabilities, data: { message: '当前未炼化本命物' } };
  }
  if (out.mode === 'equipped' && artifact) {
    return { code: 'EQUIPPED' as const, capabilities: facts.capabilities, data: { artifact, maxLevel: facts.maxLevel } };
  }
  throw new Error('本命物查询返回格式不完整');
}
