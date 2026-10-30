import { ExposeError } from 'alemonjs';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { parseBackendCompanionOathPreview } from '../api/bot/companion-oath-preview';
import { parseCompanionGiftCommand } from '../api/bot/companion-gift-command';
import { parseDailyCheckIn } from '../api/bot/daily-checkin';
import { parseMonthCardClaimResult } from '../api/bot/month-card-daily-rewards';
import { parseCompanionInfo } from '../api/bot/companion-info-queries';
import { parseCompanionTasks } from '../api/bot/companion-tasks-queries';
import { parseBackendCompanionDualCultivation } from '../api/bot/companion-relationship-actions';
import { parseBackendGiftRecords } from '../api/bot/queries';
import { parseCompanionProposalInbox } from '../api/bot/companion-proposal-queries';
import { parseRobotCompanionPropose } from '../api/bot/companion-propose-robot';
import { parseRobotCompanionProposalAction, parseRobotCompanionRejection } from '../api/bot/companion-actions-robot';
import { intentIdSchema, mutation, observation, taskAliasCommand, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const empty = object({});

type ProposalDecision = { name: string; proposalId: number; proposerId: number; createdAt: string };
const proposalDecision = object({
  name: { type: 'string', minLength: 1, maxLength: 100 },
  proposalId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  proposerId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  createdAt: { type: 'string', minLength: 1 }
});
const companion = object(
  {
    ...fields(integer, 'partnerId intimacy tongxin blessingPercent dualCultivationExp dailyDualCultivationUsed dailyDungeonUsed dailyGiftUsed'),
    ...fields(
      text,
      'partnerName partnerRealm displayPartnerName displayPartnerRealm spiritBondLevel oathType companionSince companionMessage anniversaryMessage'
    )
  },
  ['partnerName', 'partnerRealm', 'companionSince', 'anniversaryMessage']
);

export const companionActions = {
  prepare_companion_oath_upgrade: observation(
    '生成誓约升级预览和 60 秒确认引用；升级消耗一份三生同心笺，替换双方纪念物。须由玩家确认原预览。',
    'companion.oath-prepare-reference',
    empty,
    object({
      preview: object({ partnerId: integer, partnerName: text, currentBlessingPercent: integer, upgradedBlessingPercent: integer }),
      oldOwnedByUser: boolean,
      oldOwnedByPartner: boolean,
      expiresAt: text,
      reference: confirmationReferenceSchema
    }),
    () => '/升级誓约',
    data => {
      const row = data as { preview: unknown; oldOwnedByUser: unknown; oldOwnedByPartner: unknown; expiresAt: unknown; reference: unknown };
      const preview = parseBackendCompanionOathPreview(row?.preview);

      if (typeof row.oldOwnedByUser !== 'boolean' || typeof row.oldOwnedByPartner !== 'boolean') {
        throw new Error('纪念物预览不完整');
      }
      if (typeof row.expiresAt !== 'string' || !Number.isFinite(Date.parse(row.expiresAt)) || typeof row.reference !== 'string') {
        throw new Error('誓约升级预览不完整');
      }
      validateConfirmationReference(row.reference, 'o');

      return { ...row, preview };
    }
  ),
  confirm_companion_oath_upgrade: mutation<{ reference: string }>(
    '确认玩家同意的原誓约升级预览；使用原引用重试，服务端返回结算回执。',
    'companion.oath-confirm-reference',
    object({ reference: confirmationReferenceSchema }),
    object({ success: boolean, message: text }),
    () => '/升级誓约 确认',
    data => {
      const row = data as { success?: unknown; message?: unknown };

      if (row?.success !== true || typeof row.message !== 'string') {
        throw new Error('誓约升级回执不完整');
      }

      return row;
    },
    input => ({ reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'o')
  ),
  get_companion_oath_upgrade_preview: observation(
    '查询道侣誓约升级预览及双方关系。服务端升级会消耗一份三生同心笺，双方已有的同心玉佩会被移除并各获得一份仙途同心佩；此查询不提交升级，也不是升级确认凭据。',
    'companion.upgrade-oath',
    empty,
    object({ partnerId: integer, partnerName: text, currentBlessingPercent: integer, upgradedBlessingPercent: integer }),
    () => '/升级誓约',
    parseBackendCompanionOathPreview,
    () => ({ confirmed: false })
  ),
  propose_companion: mutation<{ targetUid: number; oathItemId: number }>(
    '向指定好友发起道侣申请，使用候选列表中的原誓约道具 ID；服务端重新校验道具、库存及关系，不按变化后的序号替换道具。',
    'companion.propose',
    object({
      targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
      oathItemId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
    }),
    object(
      {
        code: text,
        preflight: object(
          {
            initiatorName: text,
            target: object({ id: integer, name: text }),
            oathItems: list(object({ itemId: integer, name: text, quantity: integer, oathType: text, desc: text })),
            friends: list(object({ friendId: integer, friendName: text, friendRealm: text, intimacy: { type: 'number' }, spiritBondLevel: text })),
            ...fields(integer, 'currentPage totalPages totalCount')
          },
          ['target']
        ),
        result: object({ success: boolean, message: text, narrativeText: text, initiatorName: text }),
        mutationError: text
      },
      ['result', 'mutationError']
    ),
    input => `/结为道侣 ${input.targetUid}`,
    data => {
      const result = parseRobotCompanionPropose(data);

      if (result.mode !== 'command') {
        throw new Error('道侣申请响应不完整');
      }

      return result.command;
    },
    input => ({ mode: 'command', target: String(input.targetUid), oathItemId: input.oathItemId, fallbackPage: 1 })
  ),
  accept_companion_proposal: mutation<ProposalDecision>(
    '同意玩家选中的原道侣申请；必须传入申请列表中的申请编号、申请人编号与原创建时间，服务端事务内核验。',
    'companion.accept',
    proposalDecision,
    object({ mode: text, message: text }),
    input => `/同意道侣 ${input.name}`,
    data => {
      const result = parseRobotCompanionProposalAction(data);

      if (result.mode !== 'result') {
        throw new Error('同意道侣申请响应不完整');
      }

      return result;
    }
  ),
  reject_companion_proposal: mutation<ProposalDecision>(
    '拒绝玩家选中的原道侣申请；必须传入申请列表中的申请编号、申请人编号与原创建时间，服务端事务内核验。',
    'companion.reject',
    proposalDecision,
    object({ mode: text, message: text }),
    input => `/拒绝道侣 ${input.name}`,
    parseRobotCompanionRejection
  ),
  get_companion_candidates: observation<{ page?: number }>(
    '分页查询服务端提供的结缘候选好友和誓约道具库存；候选不保证申请一定成功，本查询不会发起申请。',
    'companion.propose',
    object({ page: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }, ['page']),
    object({
      initiatorName: text,
      oathItems: list(object({ itemId: integer, name: text, quantity: integer, oathType: text, desc: text })),
      friends: list(object({ friendId: integer, friendName: text, friendRealm: text, intimacy: { type: 'number' }, spiritBondLevel: text })),
      ...fields(integer, 'currentPage totalPages totalCount')
    }),
    input => `/结为道侣 ${input.page ?? 1}`,
    data => {
      const result = parseRobotCompanionPropose(data);

      if (result.mode !== 'friends') {
        throw new Error('道侣候选查询响应不完整');
      }

      return result.preflight;
    },
    input => ({ mode: 'friends', page: String(input.page ?? 1) })
  ),
  get_companion_proposals: observation(
    '查询本人收到的待处理道侣申请，返回服务端申请编号、申请人、灵契值及时间；编号不能代替服务端权限校验。',
    'companion.accept',
    empty,
    object({ received: list(object({ ...fields(integer, 'proposalId proposerId intimacy'), ...fields(text, 'fromName createdAt') })) }),
    () => '/同意道侣',
    data => {
      const row = data as Record<string, unknown> | null;

      if (row?.mode !== 'list') {
        throw new Error('道侣申请列表响应不完整');
      }

      return { received: parseCompanionProposalInbox(data) };
    },
    () => ({ name: '' })
  ),
  get_gift_records: observation<{ mode?: 'all' | 'send' | 'receive'; page?: number }>(
    '分页查询本人赠礼记录，可筛选全部、送出或收到；返回双方、礼物数量及实际亲密度和同心值。',
    'companion.gift-records',
    object({ mode: { type: 'string', enum: ['all', 'send', 'receive'] }, page: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }, [
      'mode',
      'page'
    ]),
    object({
      currentPage: integer,
      totalPages: integer,
      total: integer,
      rows: list(
        object({
          ...fields(integer, 'id senderUid receiverUid quantity intimacyGained tongxinGained'),
          ...fields(text, 'giftName relationText senderName receiverName createdAt'),
          premium: boolean
        })
      )
    }),
    input => `/赠礼记录${input.mode === 'send' ? ' 送出' : input.mode === 'receive' ? ' 收到' : ''} ${input.page ?? 1}`,
    data => {
      const result = parseBackendGiftRecords(data);

      return { ...result, rows: result.rows.map(({ created_at: createdAt, ...row }) => ({ ...row, createdAt: createdAt.toISOString() })) };
    },
    input => ({ mode: input.mode ?? 'all', page: String(input.page ?? 1) })
  ),
  claim_companion_daily: mutation<{ intentId?: string; taskInput?: string }>(
    '代当前道侣签到；服务端确认关系和签到资格，实际奖励发放至道侣账户。',
    'companion.claim-daily',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({
      partnerId: integer,
      partnerName: text,
      dailyCheckIn: object({ ritualText: text, accumulatedDays: integer, issued: list(object({ name: text, amount: integer })) })
    }),
    () => '/道侣签到',
    data => {
      const row = data as Record<string, unknown> | null;

      if (!Number.isSafeInteger(row?.partnerId) || Number(row?.partnerId) < 1 || typeof row?.partnerName !== 'string') {
        throw new Error('道侣签到回执不完整');
      }

      return { partnerId: row.partnerId, partnerName: row.partnerName, dailyCheckIn: parseDailyCheckIn(row.dailyCheckIn) };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_companion_month_card: mutation<{ intentId?: string; taskInput?: string }>(
    '代当前道侣领取可领取月卡奖励；服务端确认关系与资格，奖励发放至道侣账户。',
    'companion.claim-month-card',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({
      partnerId: integer,
      partnerName: text,
      monthCard: object({ days: integer, rewards: object(fields(integer, 'spiritCrystal mentalPill qiPill')) })
    }),
    () => '/道侣月卡',
    data => {
      const row = data as Record<string, unknown> | null;

      if (!Number.isSafeInteger(row?.partnerId) || Number(row?.partnerId) < 1 || typeof row?.partnerName !== 'string') {
        throw new Error('道侣月卡回执不完整');
      }

      return { partnerId: row.partnerId, partnerName: row.partnerName, monthCard: parseMonthCardClaimResult(row.monthCard) };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_gift_targets: observation<{ giftName: string; category?: string }>(
    '按名称查询可赠送的好友及服务端认可的直接赠送类别；指定 category 时检查该直接赠送类别，不保证有库存或目标资格。查询不赠送物品。',
    'companion.gift',
    object(
      { giftName: { type: 'string', minLength: 1, maxLength: 64 }, category: { type: 'string', enum: ['丹药', '道具', '图纸', '丹方', '种子', '道侣道具'] } },
      ['category']
    ),
    object(
      {
        giftExists: boolean,
        friends: list(object({ friendId: integer, friendName: text, isCompanion: boolean })),
        directCategory: text
      },
      ['directCategory']
    ),
    input => `/赠送 ${input.category ? `${input.category} ` : ''}${input.giftName}`,
    (data, input) => {
      const result = parseCompanionGiftCommand(data);

      if (
        result.mode !== 'TARGETS' ||
        result.giftName !== input.giftName ||
        typeof result.targets?.giftExists !== 'boolean' ||
        (input.category !== undefined && result.targets.directCategory !== input.category)
      ) {
        throw new Error('赠礼候选与礼物名称不匹配');
      }

      return result.targets;
    },
    input => ({ firstParam: input.giftName, ...(input.category ? { category: input.category, quantity: 1 } : {}) }),
    input => {
      if (/\s/u.test(input.giftName) || /^\d+$/u.test(input.giftName)) {
        throw new ExposeError('INVALID_INPUT', '礼物名称须为非数字的单个名称');
      }
    }
  ),
  get_gift_options: observation<{ targetUid: number }>(
    '查看可赠送给目标玩家的礼物库存和亲密度限制；targetUid 是目标玩家编号，不是调用者。',
    'companion.gift',
    object({ targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object(
      {
        targetId: integer,
        targetName: text,
        gifts: list(object({ ...fields(integer, 'itemId quantity intimacy'), name: text, isPremium: boolean })),
        ...fields(integer, 'dailyPremiumGiftUsed dailyPremiumGiftLimit weeklyIntimacyUsed weeklyIntimacyLimit')
      },
      ['targetName']
    ),
    input => `/赠送 ${input.targetUid}`,
    (data, input) => {
      const result = parseCompanionGiftCommand(data);

      if (result.mode !== 'OPTIONS' || !result.options || result.targetId !== input.targetUid || result.options.targetId !== input.targetUid) {
        throw new Error('赠礼选项与目标不匹配');
      }

      return result.options;
    },
    input => ({ firstParam: String(input.targetUid) })
  ),
  execute_task_gift_options: mutation<{ targetUid: number; taskInput: string; intentId?: string }>(
    '查看可赠送给目标玩家的礼物库存和亲密度限制；targetUid 是目标玩家编号，不是调用者。',
    'companion.gift',
    object({ targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, taskInput: taskInputSchema, intentId: intentIdSchema }, [
      'intentId'
    ]),
    object(
      {
        targetId: integer,
        targetName: text,
        gifts: list(object({ ...fields(integer, 'itemId quantity intimacy'), name: text, isPremium: boolean })),
        ...fields(integer, 'dailyPremiumGiftUsed dailyPremiumGiftLimit weeklyIntimacyUsed weeklyIntimacyLimit')
      },
      ['targetName']
    ),
    input => `/赠送 ${input.targetUid}`,
    (data, input) => {
      const result = parseCompanionGiftCommand(data);

      if (result.mode !== 'OPTIONS' || !result.options || result.targetId !== input.targetUid || result.options.targetId !== input.targetUid) {
        throw new Error('赠礼选项与目标不匹配');
      }

      return result.options;
    },
    input => ({ firstParam: String(input.targetUid) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  send_gift: mutation<{ targetUid: number; giftName: string; intentId?: string; taskInput?: string }>(
    '向目标玩家赠送一件礼物，库存、关系、次数和收益由服务端结算。同消息新赠礼使用新 intentId，同次重试沿用原编号。',
    'companion.gift',
    object(
      {
        targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        giftName: { type: 'string', minLength: 1 },
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    object({
      targetId: integer,
      success: boolean,
      ...fields(text, 'message giftName targetName reply'),
      ...fields(integer, 'intimacyGained tongxinGained'),
      premium: boolean
    }),
    input => `/赠送 ${input.targetUid} ${input.giftName}`,
    (data, input) => {
      const result = parseCompanionGiftCommand(data);

      if (result.mode !== 'GIFT' || result.targetId !== input.targetUid || !result.mutation) {
        throw new Error('赠礼结算与目标不匹配');
      }

      return { targetId: result.targetId, ...result.mutation };
    },
    input => ({ firstParam: String(input.targetUid), secondParam: input.giftName }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  send_direct_item: mutation<{ targetUid: number; itemName: string; category: string; quantity: number; intentId?: string; taskInput?: string }>(
    '直接向目标玩家转赠物品库存；类别及物品资格由服务端校验，转赠不会增加亲密度。核对目标、物品和数量，同消息新赠送使用新 intentId，重试沿用原编号。连锁任务可传入一致的 taskInput，分别检查任务推进和转赠回执。',
    'companion.gift',
    object(
      {
        targetUid: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        itemName: { type: 'string', minLength: 1, maxLength: 64 },
        category: { type: 'string', enum: ['丹药', '道具', '图纸', '丹方', '种子', '道侣道具'] },
        quantity: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    object({
      targetId: integer,
      success: boolean,
      ...fields(text, 'message giftName targetName reply'),
      ...fields(integer, 'intimacyGained tongxinGained'),
      premium: boolean
    }),
    input => taskAliasCommand(input.taskInput, [
        `赠送 ${input.category} ${input.itemName} ${input.targetUid} ${input.quantity}`,
        ...(input.quantity === 1 ? [`赠送 ${input.category} ${input.itemName} ${input.targetUid}`] : [])
      ]),
    (data, input) => {
      const result = parseCompanionGiftCommand(data);

      if (result.mode !== 'GIFT' || result.targetId !== input.targetUid || result.giftName !== input.itemName || result.mutation?.giftName !== input.itemName) {
        throw new Error('转赠回执与目标或物品不匹配');
      }

      return { targetId: result.targetId, ...result.mutation };
    },
    input => ({ firstParam: String(input.targetUid), secondParam: input.itemName, category: input.category, quantity: input.quantity }),
    input => {
      validateIntentId(input.intentId);
      if (/\s/u.test(input.itemName) || /^\d+$/u.test(input.itemName)) {
        throw new ExposeError('INVALID_INPUT', '物品名称须为非数字的单个名称');
      }
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_companion: observation(
    '查询本人道侣、灵契、同心值及今日互动次数；无道侣或未解锁保留服务端反馈。',
    'companion.info',
    empty,
    object({ companion }),
    () => '/我的道侣',
    data => {
      const result = parseCompanionInfo(data);

      if (!result.access.canUseFifthLayerFeature || !result.companion) {
        throw new Error('道侣信息成功响应缺少道侣');
      }

      return { companion: result.companion };
    }
  ),
  execute_task_companion: mutation<{ taskInput: string; intentId?: string }>(
    '查询本人道侣、灵契、同心值及今日互动次数；无道侣或未解锁保留服务端反馈。',
    'companion.info',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({ companion }),
    () => '/我的道侣',
    data => {
      const result = parseCompanionInfo(data);

      if (!result.access.canUseFifthLayerFeature || !result.companion) {
        throw new Error('道侣信息成功响应缺少道侣');
      }

      return { companion: result.companion };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_companion_tasks: observation(
    '查询道侣任务次数与已获得同心值；任务奖励由服务端自动发放，不需要手动领取。',
    'companion.tasks',
    empty,
    object({ tasks: list(object({ taskType: text, ...fields(integer, 'limit completedCount earnedTongxin'), rewardAmounts: list(integer) })) }),
    () => '/道侣任务',
    data => {
      const result = parseCompanionTasks(data);

      if (!result.access.canUseFifthLayerFeature || !result.hasCompanion) {
        throw new Error('道侣任务成功响应缺少资格');
      }

      return result;
    },
    () => ({ args: '' })
  ),
  execute_task_companion_tasks: mutation<{ taskInput: string; intentId?: string }>(
    '查询道侣任务次数与已获得同心值；任务奖励由服务端自动发放，不需要手动领取。',
    'companion.tasks',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({ tasks: list(object({ taskType: text, ...fields(integer, 'limit completedCount earnedTongxin'), rewardAmounts: list(integer) })) }),
    () => '/道侣任务',
    data => {
      const result = parseCompanionTasks(data);

      if (!result.access.canUseFifthLayerFeature || !result.hasCompanion) {
        throw new Error('道侣任务成功响应缺少资格');
      }

      return result;
    },
    () => ({ args: '' }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  dual_cultivate: mutation<{ intentId?: string; taskInput?: string }>(
    '与当前道侣双修；服务端校验灵契和每日次数，并返回双方实际入账修为及同心值。',
    'companion.dual-cultivation',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({ success: boolean, ...fields(integer, 'experienceGained creditedExperience partnerCreditedExperience tongxinGained partnerId') }, [
      'creditedExperience',
      'partnerCreditedExperience'
    ]),
    () => '/双修',
    parseBackendCompanionDualCultivation,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
