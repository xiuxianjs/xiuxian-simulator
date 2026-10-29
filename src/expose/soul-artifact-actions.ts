import { parseRobotSoulDetail, parseRobotSoulInfo } from '../api/bot/soul-artifact-overview-queries';
import { parseRobotSoulArtifactUpgrade } from '../api/bot/soul-artifact-upgrade';
import { parseSoulArtifactGradeUpgrade } from '../api/bot/soul-artifact-grade-upgrade';
import { parseSoulArtifactEquipPreview, parseSoulArtifactEquipResult } from '../api/bot/soul-artifact-equip';
import { parseSoulArtifactUnequipResult } from '../api/bot/soul-artifact-unequip';
import { parseSoulArtifactWashPreview } from '../api/bot/soul-artifact-wash';
import { requestBackend } from '../api/bot/client';
import { mutation, observation } from './mutation';
import { query } from './query';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

function hasRecoveryEffects(data: unknown, instanceId: number): boolean {
  const overview = (data as { overview?: { items?: Array<{ instanceId?: number; recoveryEffects?: unknown }> } } | null)?.overview;
  const item = overview?.items?.find(row => row.instanceId === instanceId);

  return item?.recoveryEffects !== undefined && item.recoveryEffects !== null;
}
const panel = object({ key: text, name: text, value: number });
const capability = object(
  { kind: text, available: boolean, instanceId: integer, reasonCode: text, ...fields(integer, 'maxLevels requiredItemId requiredQuantity availableQuantity') },
  ['reasonCode', 'maxLevels', 'requiredItemId', 'requiredQuantity', 'availableQuantity']
);
const detail = object(
  {
    ...fields(integer, 'instanceId artifactId gradeId level washCount lockStatus revealedAffixCount maxAffixCount maxLevel'),
    ...fields(text, 'name category positioning gradeName statusText washQuality'),
    ...fields(boolean, 'hasUpgraded isEquipped isListed'),
    capabilities: list(capability),
    basePanels: list(panel),
    combatPanels: list(panel),
    panels: list(object({ ...fields(text, 'key name affixType affixTypeName'), washBonus: number, washCap: number, isPercent: boolean })),
    recoveryEffects: list(
      object({
        ...fields(text, 'source name status statusText conditionText'),
        ...fields(number, 'templateId mp mental pieces currentPieces'),
        active: boolean
      })
    )
  },
  ['combatPanels', 'recoveryEffects']
);
const equipped = object(
  {
    ...fields(integer, 'instanceId artifactId gradeId level washCount lockStatus revealedAffixCount maxAffixCount'),
    ...fields(text, 'name category positioning gradeName statusText washQuality'),
    ...fields(boolean, 'hasUpgraded isEquipped isListed'),
    capabilities: list(capability),
    basePanels: list(panel),
    combatPanels: list(panel),
    panels: list(object({ ...fields(text, 'key name affixType affixTypeName'), washBonus: number, washCap: number, isPercent: boolean })),
    recoveryEffects: list(
      object({
        ...fields(text, 'source name status statusText conditionText'),
        ...fields(number, 'templateId mp mental pieces currentPieces'),
        active: boolean
      })
    )
  },
  ['combatPanels', 'recoveryEffects']
);
const equipPreview = object(
  {
    found: boolean,
    needsConfirmation: boolean,
    target: object({
      instanceId: integer,
      name: text,
      gradeId: integer,
      level: integer,
      panels: list(object({ key: text, value: number, isPercent: boolean }))
    }),
    current: object({
      instanceId: integer,
      name: text,
      gradeId: integer,
      level: integer,
      panels: list(object({ key: text, value: number, isPercent: boolean }))
    }),
    refundQuantity: integer,
    ...fields(text, 'currentGradeName targetGradeName refundLine'),
    comparisonLines: list(text)
  },
  ['target', 'current']
);
const washPending = object({
  ...fields(integer, 'instanceId artifactId times totalSuccess createdAt'),
  ...fields(text, 'artifactName finalMessage'),
  results: list(object({ success: boolean, action: text, message: text, details: list(text) }, ['action', 'message', 'details']))
});

function washDecision(mode: 'confirm' | 'cancel') {
  return mutation<{ reference: string }>(
    mode === 'confirm' ? '保留原洗涤随机结果，本命物状态变化时拒绝。' : '放弃原洗涤结果，已消耗的洗涤石不返还。',
    'soul-artifacts.wash-decide-reference',
    object({ reference: confirmationReferenceSchema }),
    object({ mode: text, pending: washPending }),
    () => (mode === 'confirm' ? '/确认本命物洗涤' : '/取消本命物洗涤'),
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('洗涤结果不完整');
      }
      const row = data as Record<string, unknown>;

      if (row.mode !== mode) {
        throw new Error('洗涤决定不匹配');
      }

      return { mode, pending: parseSoulArtifactWashPreview({ pending: row.pending }).pending };
    },
    input => ({ reference: input.reference, mode }),
    input => validateConfirmationReference(input.reference, 'y')
  );
}

export const soulArtifactActions = {
  prepare_soul_artifact_wash: mutation(
    '消耗 1 个洗涤石生成当前本命物随机洗涤预览；取消不返还，60 秒内确认或取消。',
    'soul-artifacts.wash-prepare-reference',
    object({}),
    object({ reference: confirmationReferenceSchema, expiresAt: integer, pending: washPending }),
    () => '/本命物洗涤',
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('洗涤预览不完整');
      }
      const row = data as Record<string, unknown>;
      const result = parseSoulArtifactWashPreview({ pending: row.pending });

      if (result.pending.times !== 1 || result.pending.totalSuccess !== 1 || !Number.isSafeInteger(row.expiresAt) || typeof row.reference !== 'string') {
        throw new Error('洗涤预览不匹配');
      }
      validateConfirmationReference(row.reference, 'y');

      return { pending: result.pending, reference: row.reference, expiresAt: row.expiresAt };
    }
  ),
  confirm_soul_artifact_wash: washDecision('confirm'),
  cancel_soul_artifact_wash: washDecision('cancel'),
  prepare_soul_artifact_replacement: mutation<{ instanceId: number }>(
    '预览替换指定本命物，保存原对象、属性对比和退款；引用有效 5 分钟。',
    'soul-artifacts.replacement-preview',
    object({ instanceId: id }),
    object({ preview: equipPreview, expiresAt: integer, reference: confirmationReferenceSchema }),
    input => `/炼化 ${input.instanceId}`,
    (data, input) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('替换预览不完整');
      }
      const row = data as Record<string, unknown>;
      const preview = parseSoulArtifactEquipPreview(row.preview);

      if (
        !preview.needsConfirmation ||
        preview.target?.instanceId !== input.instanceId ||
        !preview.current ||
        typeof row.reference !== 'string' ||
        !Number.isSafeInteger(row.expiresAt)
      ) {
        throw new Error('替换预览不匹配');
      }
      validateConfirmationReference(row.reference, 'v');

      return { preview, reference: row.reference, expiresAt: row.expiresAt };
    },
    input => ({ instanceId: input.instanceId })
  ),
  confirm_soul_artifact_replacement: mutation<{ reference: string }>(
    '确认原本命物替换预览；实例、属性或返还变化时拒绝，同一引用重试返回原回执。',
    'soul-artifacts.replacement-confirm',
    object({ reference: confirmationReferenceSchema }),
    object({
      artifact: object({
        ...fields(integer, 'id artifactId gradeId level washCount'),
        ...fields(text, 'name category'),
        ...fields(boolean, 'isEquipped isListed')
      }),
      separated: object({ name: text, ...fields(integer, 'previousLevel refundQuantity') }, ['name'])
    }),
    () => '/炼化 确认',
    data => {
      const result = parseSoulArtifactEquipResult(data);

      if (!result.artifact.isEquipped || !result.separated) {
        throw new Error('本命物替换回执不完整');
      }

      return result;
    },
    input => ({ reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'v')
  ),
  prepare_soul_artifact_separation: mutation(
    '预览当前本命物分离、等级和返还，生成本人专用确认引用；预览有效 5 分钟，已结算回执保留 24 小时。',
    'soul-artifacts.separation-preview',
    object({}),
    object({
      instanceId: integer,
      expiresAt: integer,
      reference: confirmationReferenceSchema,
      artifact: object({ name: text, ...fields(integer, 'previousLevel totalCost refundQuantity') }, ['name'])
    }),
    () => '/分离',
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('分离预览不完整');
      }
      const row = data as Record<string, unknown>;

      if (typeof row.reference !== 'string' || !Number.isSafeInteger(row.instanceId) || !Number.isSafeInteger(row.expiresAt)) {
        throw new Error('分离预览不完整');
      }
      validateConfirmationReference(row.reference, 'u');

      return row;
    }
  ),
  confirm_soul_artifact_separation: mutation<{ reference: string }>(
    '确认原分离预览，实例或等级变化会拒绝；相同引用重试返回原回执，不重复退款。',
    'soul-artifacts.separation-confirm',
    object({ reference: confirmationReferenceSchema }),
    object({ outcome: text, artifact: object({ name: text, ...fields(integer, 'previousLevel totalCost refundQuantity') }, ['name']) }),
    () => '/分离 确认',
    data => {
      const result = parseSoulArtifactUnequipResult(data);

      if (result.outcome !== 'unequipped' || !result.artifact) {
        throw new Error('分离确认回执不完整');
      }

      return result;
    },
    input => ({ reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'u')
  ),
  separate_soul_artifact_if_unupgraded: mutation(
    '分离执行时当前已炼化的零等级本命物；如果当前等级大于零则只返回确认提示，不执行分离。',
    'soul-artifacts.unequip',
    object({}),
    object({
      mode: { type: 'string', enum: ['confirmation', 'done'] },
      message: text,
      result: object({ outcome: text, artifact: object({ name: text, ...fields(integer, 'previousLevel totalCost refundQuantity') }, ['name']) })
    }),
    () => '/分离',
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('本命物分离回执不完整');
      }
      const row = data as Record<string, unknown>;
      const result = parseSoulArtifactUnequipResult(row.result);

      if (
        typeof row.message !== 'string' ||
        !result.artifact ||
        (row.mode === 'done' && (result.outcome !== 'unequipped' || result.artifact.previousLevel !== 0)) ||
        (row.mode === 'confirmation' && (result.outcome !== 'confirmation' || result.artifact.previousLevel <= 0)) ||
        (row.mode !== 'done' && row.mode !== 'confirmation')
      ) {
        throw new Error('本命物分离回执不匹配');
      }

      return { mode: row.mode, message: row.message, result };
    },
    () => ({ confirmed: false })
  ),
  refine_soul_artifact_empty_slot: mutation<{ instanceId: number }>(
    '在当前没有炼化本命物时炼化指定实例；如果执行时已有本命物则拒绝，不替换、不消耗同编号道具。',
    'soul-artifacts.refine-empty',
    object({ instanceId: id }),
    object({
      artifact: object({
        ...fields(integer, 'id artifactId gradeId level washCount'),
        ...fields(text, 'name category'),
        ...fields(boolean, 'isEquipped isListed')
      })
    }),
    input => `/炼化 ${input.instanceId}`,
    (data, input) => {
      const result = parseSoulArtifactEquipResult(data);

      if (result.artifact.id !== input.instanceId || !result.artifact.isEquipped || result.separated !== null) {
        throw new Error('本命物炼化回执目标不匹配');
      }

      return result;
    },
    input => ({ instanceId: input.instanceId })
  ),
  preview_soul_artifact_refine: query(
    '预览指定本命物的炼化与替换影响，查询不炼化或消耗道具；预览不构成绑定确认。',
    object(
      {
        found: boolean,
        needsConfirmation: boolean,
        target: object({
          instanceId: integer,
          name: text,
          gradeId: integer,
          level: integer,
          panels: list(object({ key: text, value: number, isPercent: boolean }))
        }),
        current: object({
          instanceId: integer,
          name: text,
          gradeId: integer,
          level: integer,
          panels: list(object({ key: text, value: number, isPercent: boolean }))
        }),
        refundQuantity: integer,
        ...fields(text, 'currentGradeName targetGradeName refundLine'),
        comparisonLines: list(text)
      },
      ['target', 'current']
    ),
    async ({ bid, uid, request }, input) => {
      const instanceId = input.instanceId!;
      const result = parseSoulArtifactEquipPreview(
        await requestBackend(bid, 'get_players_id_soul_artifacts_artifactId_equip_preview', {
          path: { id: uid, artifactId: instanceId },
          ...request
        })
      );

      if (result.target && result.target.instanceId !== instanceId) {
        throw new Error('本命物炼化预览目标不匹配');
      }

      return result;
    },
    object({ instanceId: id })
  ),
  get_equipped_soul_artifact: observation(
    '查询当前炼化的本命物、属性及操作资格；区分没有本命物和尚未炼化。',
    'soul-artifacts.info',
    object({}),
    object(
      {
        code: text,
        message: text,
        maxLevel: integer,
        artifact: equipped,
        capabilities: list(object({ kind: text, available: boolean, reasonCode: text }, ['reasonCode']))
      },
      ['message', 'maxLevel', 'artifact', 'capabilities']
    ),
    () => '/本命物信息',
    data => {
      const result = parseRobotSoulInfo(data);

      if (result.code === 'EQUIPPED') {
        if (result.data.artifact.capabilities.some(item => item.instanceId !== result.data.artifact.instanceId)) {
          throw new Error('本命物操作目标不匹配');
        }

        return {
          code: result.code,
          capabilities: result.capabilities,
          ...result.data,
          artifact: {
            ...result.data.artifact,
            recoveryEffects: hasRecoveryEffects(data, result.data.artifact.instanceId) ? result.data.artifact.recoveryEffects : undefined
          }
        };
      }

      return { code: result.code, ...result.data, ...(result.code === 'NOT_EQUIPPED' ? { capabilities: result.capabilities } : {}) };
    }
  ),
  get_soul_artifact_detail: observation<{ instanceId: number }>(
    '查询本人指定本命物实例的属性、状态和服务端操作资格。',
    'soul-artifacts.detail',
    object({ instanceId: id }),
    detail,
    input => `/本命物详情 ${input.instanceId}`,
    (data, input) => {
      const result = parseRobotSoulDetail(data);

      if (result.instanceId !== input.instanceId) {
        throw new Error('本命物详情实例不匹配');
      }

      return { ...result, recoveryEffects: hasRecoveryEffects(data, result.instanceId) ? result.recoveryEffects : undefined };
    },
    input => ({ instanceId: String(input.instanceId) })
  ),
  upgrade_equipped_soul_artifact: mutation<{ levels: number }>(
    '升级当前已炼化的本命物，消耗服务端实际计算的材料；目标是执行时当前炼化实例，返回实际实例、等级与消耗。',
    'soul-artifacts.upgrade',
    object({ levels: id }),
    object({
      message: text,
      result: object({
        artifact: object({ id: integer, name: text, level: integer }),
        ...fields(integer, 'previousLevel actualLevels cost'),
        message: text,
        compareLines: list(text),
        comparison: list(object({ key: text, before: number, after: number }))
      })
    }),
    input => `/本命物升级 ${input.levels}`,
    parseRobotSoulArtifactUpgrade,
    input => ({ levels: String(input.levels) })
  ),
  promote_soul_artifact: mutation<{ instanceId: number }>(
    '升品指定本命物实例，直接消耗同名材料；资格与实际消耗由服务端校验，执行后不可撤销。',
    'soul-artifacts.grade-upgrade',
    object({ instanceId: id }),
    object({
      artifact: object({ ...fields(integer, 'id artifactId gradeId level'), name: text }),
      ...fields(integer, 'consumed previousGrade newGrade'),
      ...fields(text, 'previousGradeName newGradeName')
    }),
    input => `/本命物升品 ${input.instanceId}`,
    (data, input) => {
      const result = parseSoulArtifactGradeUpgrade(data);

      if (result.artifact.id !== input.instanceId) {
        throw new Error('本命物升品回执实例不匹配');
      }

      return result;
    },
    input => ({ instanceId: String(input.instanceId) })
  )
};
