// Frozen before equipped projection; only import locations adapted for this fixture.
import { parseRecoveryEffects, type RecoveryEffect } from '@src/api/schemas/resource-recovery';
import { requestBackend } from '@src/api/bot/client';
import type {
  SoulArtifactOverviewCapability,
  SoulArtifactOverviewCapabilityKind,
  SoulArtifactOverviewPageCapability
} from '@src/api/schemas/soul-artifact-overview-query';

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

  if (!Number.isInteger(result) || result < 0) {
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

  if (!Number.isInteger(instanceId) || instanceId <= 0) {
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
export async function getBackendSoulArtifactOverview(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = record(await requestBackend(bid, 'get_players_id_soul_artifacts_overview', { path: { id: uid } }));
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
    const gradeId = number(row.gradeId);
    const lockStatus = number(row.lockStatus);

    return {
      recoveryEffects: parseRecoveryEffects(row.recoveryEffects),
      instanceId: number(row.instanceId),
      artifactId: number(row.artifactId),
      name: text(row.name),
      category: text(row.category),
      positioning: text(row.positioning),
      gradeId,
      gradeName: text(row.gradeName),
      level: number(row.level),
      washCount: number(row.washCount),
      hasUpgraded: boolean(row.hasUpgraded),
      isEquipped: boolean(row.isEquipped),
      lockStatus,
      statusText: text(row.statusText),
      isListed: lockStatus === 2,
      washQuality: text(row.washQualityText),
      revealedAffixCount: panels.length,
      maxAffixCount: number(row.maxAffixCount),
      capabilities: rows(row.capabilities).map(capability),
      panels,
      basePanels: rows(row.basePanels).map(panel => {
        const stat = key(panel.key);

        if (!['patk', 'matk', 'pdef', 'mdef', 'hp', 'speed'].includes(stat)) {
          throw new Error('本命物基础属性无效');
        }

        return { key: stat, name: text(panel.name), value: number(panel.value) };
      })
    };
  });

  const equippedInstanceId = data.equippedInstanceId === null ? null : number(data.equippedInstanceId);

  if (equippedInstanceId !== null && (!Number.isInteger(equippedInstanceId) || equippedInstanceId <= 0)) {
    throw new Error('本命物当前炼化实例无效');
  }

  return {
    items,
    maxLevel: data.realmLevel === null ? 36 : number(data.realmLevel),
    equippedInstanceId,
    capabilities: rows(data.capabilities).map(pageCapability)
  };
}
