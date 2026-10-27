import { mutation } from './mutation';
import { query } from './query';
import { boolean, fields, integer, list, number, object, text } from './schema';
import { confirmationReferenceSchema as reference, validateConfirmationReference } from './confirmation';
import { requestBackend } from '../api/bot/client';
import { parsePromotionCommand } from '../api/bot/promotion-command';
import { parseTribulationPreparation, parseTribulationHeartDemon, parseTribulationReceipt, parseTribulationEvasionResult } from '../api/schemas/tribulation';
import { parseTribulationConfirmationQuery } from '../api/bot/tribulation-confirmation-query';

const positive = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const eventInput = object({ eventId: positive });
const grade = { type: 'string' as const, enum: ['low', 'standard', 'high'] };
const heartChoice = { type: 'string' as const, enum: ['guard', 'slay', 'accept'] };
const progress = object({ ...fields(number, 'successful requiredAttempts attackBonusPercent'), completed: boolean });
const heart = object(
  {
    ...fields(text, 'topic title prompt answeredAt'),
    sourceEventId: integer,
    choice: heartChoice,
    options: list(object({ id: heartChoice, name: text, attackMultiplier: number, defenseMultiplier: number }))
  },
  ['sourceEventId', 'choice', 'answeredAt']
);
const evasion = object({ level: integer, npcAttackBonusPercent: number, recoversAt: text }, ['recoversAt']);
const conditions = {
  attackLimit: object({
    maxMultiplier: number,
    changes: list(object({ ...fields(integer, 'layer position'), attribute: text, ...fields(number, 'base before after') }))
  }),
  heartDemon: heart,
  evasion,
  karma: object({
    capturedAt: text,
    ...fields(number, 'currentShaQi shaQiAttackBonusPercent activeDisruptions disruptionAttackBonusPercent npcAttackBonusPercent')
  }),
  weather: object({
    ...fields(text, 'id name startsAt changesAt'),
    npc: object(
      fields(number, 'physicalAttackMultiplier magicAttackMultiplier physicalDefenseMultiplier magicDefenseMultiplier speedMultiplier critRatePoints'),
      'physicalAttackMultiplier magicAttackMultiplier physicalDefenseMultiplier magicDefenseMultiplier speedMultiplier critRatePoints'.split(' ')
    ),
    changes: list(object({ ...fields(integer, 'layer position'), attribute: text, before: number, after: number }))
  }),
  disruption: object({ count: integer, attackBonusPercent: number })
};
const preparation = object(
  {
    eventId: positive,
    ...fields(text, 'targetRealm status opensAt deadline retryAt recoveryEndsAt earliestRetryAt strikeAt'),
    ...fields(boolean, 'canOpen canStart canAnswerHeartDemon canEvade'),
    requiredAttempts: number,
    materials: list(object({ ...fields(integer, 'itemId requiredQuantity currentQuantity'), itemName: text, sufficient: boolean })),
    heartDemon: heart,
    evasion,
    evasionPreview: object(fields(number, 'nextLevel nextAttackBonusPercent resetAfterSeconds')),
    qualityProgress: progress,
    gradeOptions: list(object({ grade, attackMultiplier: number, attackBonusPercent: number }))
  },
  [
    'opensAt',
    'deadline',
    'retryAt',
    'recoveryEndsAt',
    'earliestRetryAt',
    'strikeAt',
    'canOpen',
    'canAnswerHeartDemon',
    'canEvade',
    'materials',
    'heartDemon',
    'evasion',
    'evasionPreview',
    'qualityProgress',
    'gradeOptions'
  ]
);
const unit = object({ Name: text, ...fields(number, 'HP MP PhysicalAttack MagicAttack PhysicalDefense MagicDefense Speed') });
const promotion = object(
  {
    ...fields(boolean, 'success capReached'),
    ...fields(text, 'message capRealmName'),
    unlockedRecipes: list(text),
    masterStageMessages: list(text),
    newRealm: object({ name: text, ...fields(number, 'spiritualPower speed magicAttack physicalAttack magicDefense physicalDefense experienceLimit') }),
    tribulation: object({ name: text, totalLayers: integer, passedLayers: integer, summary: text })
  },
  ['newRealm', 'tribulation']
);
const charging = object(
  {
    eventId: positive,
    status: { type: 'string', enum: ['charging', 'cancelled', 'succeeded', 'failed'] },
    grade,
    attackMultiplier: number,
    ...fields(text, 'confirmedAt strikeAt cancelledReason'),
    refunded: boolean
  },
  ['cancelledReason']
);
const receipt = object(
  {
    eventId: positive,
    grade,
    success: boolean,
    promoted: boolean,
    experienceBefore: number,
    experienceAfter: number,
    progress,
    materials: list(object({ itemId: integer, itemName: text, requiredQuantity: integer })),
    battle: object({ name: text, summary: text, totalLayers: integer, passedLayers: integer }),
    conditions: object(conditions, Object.keys(conditions)),
    debuff: object({ applied: boolean, expiresAt: text })
  },
  ['debuff', 'conditions']
);
const resultSchema = object(
  {
    kind: { type: 'string', enum: ['charging', 'receipt', 'unconfirmed'] },
    charging,
    receipt,
    failure: object({ code: text, message: text }),
    status: integer,
    receiptFailure: object({ code: text, message: text }),
    receiptStatus: integer
  },
  ['charging', 'receipt', 'failure', 'status', 'receiptFailure', 'receiptStatus']
);

function result(value: unknown, expectedEvent?: number) {
  const raw = value as Record<string, any>;

  if (raw?.startFailure) {
    return { kind: 'unconfirmed', failure: raw.startFailure, status: raw.startStatus, receiptFailure: raw.receiptFailure, receiptStatus: raw.receiptStatus };
  }
  const parsed = parseTribulationReceipt(value);

  if (expectedEvent && parsed.eventId !== expectedEvent) {
    throw new Error('渡劫回执事件编号不匹配');
  }

  return 'status' in parsed ? { kind: 'charging', charging: parsed } : { kind: 'receipt', receipt: parsed };
}
function prep(value: unknown, expectedEvent: number) {
  const parsed = parseTribulationPreparation(value);

  if (parsed.eventId !== expectedEvent) {
    throw new Error('渡劫准备事件编号不匹配');
  }

  return parsed;
}
export const tribulationActions = {
  promote_realm: mutation(
    '执行原有晋级入口；可能返回渡劫准备，也可能执行晋级并返回成功、失败或境界上限结果。必须检查 mode 和 promotion.success；不自动确认开劫。',
    'realm.promotion',
    object({}),
    object({ mode: { type: 'string', enum: ['preparation', 'promotion'] }, preparation, promotion }, ['preparation', 'promotion']),
    () => '/晋级',
    data => {
      const parsed = parsePromotionCommand(data);

      return parsed.mode === 'preparation'
        ? { mode: parsed.mode, preparation: parseTribulationPreparation(parsed.overview.tribulationPreparation) }
        : { mode: parsed.mode, promotion: parsed.result };
    }
  ),
  get_tribulation_preparation: query(
    '重新查询本人当前渡劫准备、材料、评级与心魔选项；preparation 缺失表示服务端未提供可用渡劫。可能由服务端初始化状态。',
    object({ preparation }, ['preparation']),
    async ({ bid, uid, request }) => {
      const raw = (await requestBackend(bid, 'get_players_id_realm_overview', { path: { id: uid }, ...request })) as Record<string, unknown>;

      if (raw.playerId !== uid) {
        throw new Error('渡劫准备返回玩家不匹配');
      }

      return {
        preparation:
          raw.tribulationPreparation === null || raw.tribulationPreparation === undefined ? undefined : parseTribulationPreparation(raw.tribulationPreparation)
      };
    }
  ),
  open_tribulation: mutation<{ eventId: number }>(
    '开启指定本人渡劫事件，进入准备阶段；后续评级预览与原引用确认另行执行。',
    'tribulation.command',
    eventInput,
    preparation,
    input => `/开启渡劫 ${input.eventId}`,
    (data, input) => prep(data, input.eventId),
    input => ({ kind: 'open', eventId: input.eventId })
  ),
  preview_tribulation: mutation<{ eventId: number; grade: string }>(
    '预览指定渡劫评级的材料、攻击倍率、修为代价和战斗条件，取得原 r1_t 引用；用户确认原预览后才能开劫。',
    'tribulation.command',
    object({ eventId: positive, grade }),
    object({
      confirmationReference: reference,
      confirmation: object(
        {
          eventId: positive,
          grade,
          attackMultiplier: number,
          rewardScope: { type: 'string', enum: ['current', 'cumulative'] },
          ...fields(number, 'experienceBefore successExperienceCost failureExperienceAfter'),
          progress,
          materials: list(object({ itemId: integer, quantity: integer })),
          battle: object({ mode: text, name: text, player: unit, layers: list(object({ layer: integer, enemies: list(unit) })) }, ['mode']),
          ...conditions
        },
        Object.keys(conditions)
      ),
      materialNames: list(object({ itemId: integer, name: text }))
    }),
    input => `/渡劫评级 ${input.eventId} ${input.grade}`,
    (data, input) => {
      const parsed = parseTribulationConfirmationQuery(data);

      if (parsed.confirmation.eventId !== input.eventId || parsed.confirmation.grade !== input.grade) {
        throw new Error('渡劫预览不匹配原事件及评级');
      }

      return {
        ...parsed,
        materialNames: Object.entries(parsed.materialNames).map(([itemId, name]) => ({ itemId: Number(itemId), name })),
        confirmationReference: (data as Record<string, unknown>).confirmationReference
      };
    },
    input => ({ kind: 'confirm', eventId: input.eventId, grade: input.grade })
  ),
  confirm_tribulation: mutation<{ reference: string }>(
    '用户明确确认原评级预览后，以原 r1_t 引用开劫。kind=charging 是状态回执，须检查 charging.status；状态 charging 表示等待落雷，尚未成功；unconfirmed 表示结果待核实，应查原事件，不重新预览自动提交。',
    'tribulation.command',
    object({ reference }),
    resultSchema,
    input => `/渡劫开劫 ${input.reference}`,
    data => result(data),
    input => ({ kind: 'reference', reference: input.reference }),
    input => validateConfirmationReference(input.reference, 't')
  ),
  get_tribulation_result: query(
    '重新读取指定本人渡劫事件的等待落雷、取消或结算状态；不会重新开劫，charging 不能当作渡劫成功。',
    resultSchema,
    async ({ bid, uid, request }, input) => result(
        await requestBackend(bid, 'get_players_id_tribulation_events_eventId_result', { path: { id: uid, eventId: input.eventId! }, ...request }),
        input.eventId
      ),
    eventInput
  ),
  preview_heart_demon: mutation<{ eventId: number; choice: string }>(
    '预览本人本场心魔回答，返回原规则下效果及 r1_h 引用；只允许 guard、slay、accept，确认后再提交原引用。',
    'tribulation.command',
    object({ eventId: positive, choice: heartChoice }),
    object({ preparation, confirmationReference: reference }),
    input => `/心魔选择 ${input.eventId} ${input.choice}`,
    (data, input) => ({
      preparation: prep((data as Record<string, unknown>).tribulationPreparation, input.eventId),
      confirmationReference: (data as Record<string, unknown>).confirmationReference
    }),
    input => ({ kind: 'heartPreview', eventId: input.eventId, choice: input.choice })
  ),
  confirm_heart_demon: mutation<{ reference: string }>(
    '用户确认本场原心魔选项后，以原 r1_h 引用回答；保留原事件、选择及策略版本，不允许更换最新策略后自动重试。',
    'tribulation.command',
    object({ reference }),
    heart,
    input => `/心魔回答 ${input.reference}`,
    parseTribulationHeartDemon,
    input => ({ kind: 'reference', reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'h')
  ),
  evade_tribulation: mutation<{ eventId: number }>(
    '主动暂避指定本人渡劫，影响暂避档位、恢复及再次开启时间；必须用户明确要求暂避，不是取消一次查询。',
    'tribulation.command',
    eventInput,
    object({ eventId: positive, status: { type: 'string', enum: ['evaded'] }, levelAfter: integer, recoversAt: text, retryAt: text }),
    input => `/暂避渡劫 ${input.eventId}`,
    (data, input) => {
      const parsed = parseTribulationEvasionResult(data);

      if (parsed.eventId !== input.eventId) {
        throw new Error('暂避回执事件不匹配');
      }

      return parsed;
    },
    input => ({ kind: 'evade', eventId: input.eventId })
  )
};
