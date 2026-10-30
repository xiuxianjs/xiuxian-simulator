import { ExposeError, type ExposeReadonly } from 'alemonjs';
import {
  parseDailyPackFreePreview,
  parseDailyPackFreeReceipt,
  parseRelicsOverview,
  parseSpiritVein,
  parseSpiritVeinCalendar,
  parseTreasureConfirmation,
  parseTreasureDailyPacks,
  parseTreasureOverview,
  parseTreasureReceipt,
  validTreasureConfirmationRef,
  type TreasurePreviewKind
} from '../api/bot/treasures';
import type { GameEvent } from '../types/event';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const reference = { type: 'string' as const, minLength: 1, maxLength: 64 };
const previewResult = object({ kind: text, summary: list(text), confirmationRef: reference, expiresAt: text, operationId: text, detailsJson: text }, [
  'detailsJson'
]);
const empty = object({});

function preview<I extends Record<string, unknown>>(
  kind: TreasurePreviewKind,
  description: string,
  schema: ReturnType<typeof object>,
  command: (input: I) => string,
  argumentsFor: (input: I) => Record<string, unknown>,
  validateInput?: (input: ExposeReadonly<I>) => void
) {
  return observation<I>(
    description,
    'treasures.preview',
    schema,
    previewResult,
    command,
    data => {
      const result = parseTreasureConfirmation(data);

      if (result.kind !== kind || !result.operationId || result.summary.length === 0) {
        throw new Error('宝物预览回执不匹配');
      }
      const row = data as Record<string, unknown>;

      return { ...result, ...(row.data === undefined ? {} : { detailsJson: JSON.stringify(row.data) }) };
    },
    input => ({ kind, ...argumentsFor(input) }),
    validateInput
  );
}

function privateDailyPack(event: GameEvent) {
  if (event.name !== 'private.message.create' || event.isPrivate === false || event.IsPrivate === false) {
    throw new ExposeError('FORBIDDEN', '每日礼包仅支持私聊');
  }
}

type Single = { treasureId: number };
export const treasureActions = {
  get_treasures: observation(
    '查询本人宝物、碎片、培养能力、经验和仙蕴；itemJson 保留服务端完整宝物详情。',
    'treasures.overview',
    empty,
    object({
      ...fields(integer, 'experience xianYun levelCap version'),
      fortuneJson: text,
      items: list(
        object(
          {
            ...fields(integer, 'treasureId rarity grade level fragments duplicates'),
            name: text,
            ...fields(boolean, 'owned canUpgrade canPromote canSynthesize'),
            itemJson: text
          },
          ['canSynthesize']
        )
      )
    }),
    () => '/宝物',
    data => {
      const result = parseTreasureOverview(data);

      const rawItems = (data as { items: Array<Record<string, unknown>> }).items;

      return {
        ...result,
        fortuneJson: JSON.stringify(result.fortune),
        items: result.items.map((item, index) => {
          const raw = rawItems[index];

          if (raw.canSynthesize !== undefined && typeof raw.canSynthesize !== 'boolean') {
            throw new Error('宝物合成资格无效');
          }

          return {
            ...item,
            ...(raw.canSynthesize === undefined ? {} : { canSynthesize: raw.canSynthesize }),
            treasureId: item.definition.id,
            name: item.definition.name,
            rarity: item.definition.rarity,
            itemJson: JSON.stringify(raw)
          };
        })
      };
    }
  ),
  get_ancient_relics: observation(
    '查询探索余额、免费次数、保底、概率和历史；详情来自服务端，免费次数并非购买或奖励承诺。',
    'ancient-relics.overview',
    empty,
    object({
      ...fields(integer, 'totalExplorations milestoneProgress pendingSelections'),
      ...fields(boolean, 'freeAvailable spiritTenDiscountAvailable'),
      balances: object(fields(integer, 'spiritCrystal daoCrystal treasureMaps')),
      shapeRates: object(fields(number, 'singleComplete tenExpectedComplete tenAverageComplete')),
      pity: list(
        object({ rarity: integer, name: text, counter: integer, hardPity: integer, nextProbability: number, conditionalProbability: number, scope: text }, [
          'conditionalProbability',
          'scope'
        ])
      ),
      wholeRates: list(object({ rarity: integer, name: text, probability: number, tenProbability: number, scope: text }, ['tenProbability', 'scope'])),
      rules: list(text),
      detailsJson: text
    }),
    () => '/上古遗珍',
    data => {
      const result = parseRelicsOverview(data);

      return { ...result, detailsJson: JSON.stringify(result) };
    }
  ),
  preview_treasure_exploration: preview<{ source: 'free' | 'spirit_crystal' | 'dao_crystal' | 'treasure_map'; count: number }>(
    'explore',
    '预览探索次数和原费用；仅支持 1 或 10 次，免费探索仅支持 1 次。核对 summary，确认时使用原引用。',
    object({
      source: { type: 'string', enum: ['free', 'spirit_crystal', 'dao_crystal', 'treasure_map'] },
      count: { type: 'integer', minimum: 1, maximum: 10 }
    }),
    () => '/上古遗珍',
    input => ({ source: input.source, count: input.count }),
    input => {
      if (![1, 10].includes(input.count) || (input.source === 'free' && input.count !== 1)) {
        throw new ExposeError('INVALID_INPUT', '探索次数仅支持 1 或 10，免费探索仅支持 1 次');
      }
    }
  ),
  preview_treasure_synthesis: preview<Single>(
    'synthesize',
    '预览指定宝物碎片合成；确认只执行原预览。',
    object({ treasureId: id }),
    () => '/宝物 合成',
    input => input
  ),
  preview_treasure_upgrade: preview<Single>(
    'upgrade',
    '预览指定宝物升级及原等级和消耗；状态变化时服务端拒绝。',
    object({ treasureId: id }),
    input => `/宝物 升级 ${input.treasureId}`,
    input => input
  ),
  preview_treasure_promotion: preview<Single>(
    'promote',
    '预览指定宝物升品和消耗；服务端绑定原品级与材料。',
    object({ treasureId: id }),
    input => `/宝物 升品 ${input.treasureId}`,
    input => input
  ),
  preview_mythic_treasure_selection: preview<Single>(
    'select-mythic',
    '预览神话自选目标；消耗次数与目标由服务端绑定。',
    object({ treasureId: id }),
    input => `/上古遗珍 自选 ${input.treasureId}`,
    input => input
  ),
  preview_treasure_batch_upgrade: preview(
    'batch-upgrade',
    '预览全部可升级宝物及原消耗清单，确认只执行本次清单。',
    empty,
    () => '/宝物 一键升级',
    () => ({})
  ),
  preview_treasure_batch_promotion: preview(
    'batch-promote',
    '预览全部可升品宝物及原消耗清单，确认只执行本次清单。',
    empty,
    () => '/宝物 一键突破',
    () => ({})
  ),
  preview_treasure_decomposition: preview<{ items: Array<{ treasureId: number; kind: 'body' | 'fragment'; quantity: number }> }>(
    'decompose',
    '预览指定重复本体或碎片的分解清单及仙蕴；确认后不可撤销。',
    object({
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: object({ treasureId: id, kind: { type: 'string', enum: ['body', 'fragment'] }, quantity: id })
      }
    }),
    () => '/宝物 分解',
    input => ({ items: input.items })
  ),
  preview_maxed_treasure_decomposition: preview(
    'decompose',
    '预览已满品宝物的可分解清单，服务端固定原清单和库存版本。',
    empty,
    () => '/宝物 一键分解',
    () => ({ allMaxed: true })
  ),
  preview_spirit_vein_claim: preview(
    'claimLease',
    '预览灵脉租契可领取收益，服务端绑定原金额。',
    empty,
    () => '/我的权益 灵脉租契',
    () => ({})
  ),
  get_spirit_vein: observation(
    '查询灵脉租契开通状态、已解锁收益、余额和期限；到期后未领收益以服务端为准。',
    'spirit-vein.overview',
    empty,
    object(
      {
        ...fields(boolean, 'active canPurchase'),
        ...fields(text, 'startDate endDate purchaseUnavailableReason'),
        ...fields(
          integer,
          'remainingDays claimableDays claimableCrystal claimedDays totalDays futureDays reservedDays maxDays packageId priceAmount dailyCrystal immediateDaoCrystal'
        )
      },
      ['startDate', 'endDate', 'purchaseUnavailableReason', 'claimedDays', 'totalDays', 'futureDays', 'reservedDays', 'packageId']
    ),
    () => '/我的权益 灵脉租契',
    parseSpiritVein
  ),
  get_spirit_vein_calendar: observation<{ page?: number }>(
    '分页查询灵脉租契各收益日的已领取、可领取或未到期状态。',
    'spirit-vein.calendar',
    object({ page: { type: 'integer', minimum: 1, maximum: 2147483647 } }, ['page']),
    object({
      ...fields(integer, 'page totalPages totalDays'),
      items: list(object({ ...fields(integer, 'day spiritCrystal'), ...fields(text, 'rewardDate state') }))
    }),
    input => `/我的权益 灵脉租契 日历 ${input.page ?? 1}`,
    parseSpiritVeinCalendar,
    input => ({ page: input.page ?? 1 })
  ),
  get_treasure_daily_packs: observation(
    '私聊查询每日礼包的剩余额度、价格及免费领取资格；未决订单独立返回，不自动购买。',
    'treasures.daily-packs',
    empty,
    object(
      {
        serverDate: text,
        unresolvedOrderNo: text,
        quotas: list(object({ sku: text, ...fields(integer, 'limit successful pending remaining') })),
        products: list(
          object(
            {
              ...fields(text, 'sku name unavailableReason label'),
              ...fields(integer, 'packageId priceAmount basePriceAmount creditedAmount limit remaining'),
              ...fields(boolean, 'canClaimFree available'),
              promotionTexts: list(text),
              rewardParts: list(
                object({ ...fields(text, 'kind name'), ...fields(integer, 'quantity independentRolls perRoll') }, ['independentRolls', 'perRoll'])
              )
            },
            ['packageId']
          )
        )
      },
      ['unresolvedOrderNo']
    ),
    () => '/上古遗珍 礼包',
    parseTreasureDailyPacks,
    (_input, event) => {
      privateDailyPack(event);

      return {};
    }
  ),
  preview_treasure_free_daily_pack: observation(
    '私聊预览符合服务端资格的免费日礼包；返回原引用和有效期，不创建支付订单。服务端可能初始化宝物账户。',
    'treasures.daily-pack-free-preview',
    empty,
    object({ kind: text, confirmationRef: reference, summary: list(text), expiresAt: text, operationId: text }),
    () => '/上古遗珍 领取全包',
    parseDailyPackFreePreview,
    (_input, event) => {
      privateDailyPack(event);

      return {};
    }
  ),
  confirm_treasure_free_daily_pack: mutation<{ confirmationRef: string }>(
    '私聊确认原免费日礼包引用；服务端核对归属、原额度和有效期，重复原引用返回原领取结果。',
    'treasures.daily-pack-free-confirm',
    object({ confirmationRef: reference }),
    object({
      operationId: text,
      message: text,
      grant: object({
        businessDate: text,
        ...fields(integer, 'spiritCrystal daoCrystal treasureMaps'),
        fragments: list(object({ ...fields(integer, 'treasureId rarity quantity'), name: text })),
        promotionTexts: list(text)
      })
    }),
    input => `/确认礼包 ${input.confirmationRef}`,
    parseDailyPackFreeReceipt,
    (input, event) => {
      privateDailyPack(event);

      return { confirmationRef: input.confirmationRef };
    },
    input => {
      if (!validTreasureConfirmationRef(input.confirmationRef)) {
        throw new ExposeError('INVALID_INPUT', '请使用原礼包预览的完整确认引用');
      }
    }
  ),
  get_treasure_operation_status: observation<{ operationId: string }>(
    '根据原预览的 operationId 核对本人结算状态；unknown 仅表示没有查到已完成记录，不保证原请求没有在处理中。',
    'treasures.operation-status',
    object({ operationId: { type: 'string', minLength: 1, maxLength: 128 } }),
    object({ operationId: text, status: { type: 'string', enum: ['unknown', 'completed'] }, kind: text, resultJson: text }, ['kind', 'resultJson']),
    () => '/宝物',
    (data, input) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('宝物操作状态不完整');
      }
      const row = data as Record<string, unknown>;

      if (row.operationId !== input.operationId || !['unknown', 'completed'].includes(String(row.status))) {
        throw new Error('宝物操作状态不匹配');
      }
      if (row.status === 'unknown') {
        return { operationId: row.operationId, status: row.status };
      }
      if (typeof row.kind !== 'string' || !row.result || typeof row.result !== 'object' || Array.isArray(row.result)) {
        throw new Error('宝物原结果不完整');
      }

      return { operationId: row.operationId, status: row.status, kind: row.kind, resultJson: JSON.stringify(row.result) };
    }
  ),
  confirm_treasure_action: mutation<{ confirmationRef: string }>(
    '确认原宝物预览引用；服务端校验归属、原操作和状态并幂等结算。结果不明时重试原引用，不得重建最新预览。',
    'treasures.confirm',
    object({ confirmationRef: reference }),
    object({ kind: text, operationId: text, message: text, resultJson: text }),
    input => `/确认宝物 ${input.confirmationRef}`,
    data => {
      const parsed = parseTreasureReceipt(data);
      const row = data as Record<string, unknown>;

      return { kind: parsed.kind, operationId: parsed.operationId, message: parsed.result.message, resultJson: JSON.stringify(row.result) };
    },
    input => ({ confirmationRef: input.confirmationRef }),
    input => {
      if (!validTreasureConfirmationRef(input.confirmationRef)) {
        throw new ExposeError('INVALID_INPUT', '请使用原宝物预览的完整确认引用');
      }
    }
  )
};
