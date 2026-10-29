import { ExposeError } from 'alemonjs';
import { parseMasterAction, parseMasterClaimTitle, parseMasterTargetAction, parseMasterDecision } from '../api/bot/master-actions';
import { parseMasterInfo } from '../api/bot/master-info-queries';
import { mutation, observation } from './mutation';
import { boolean, integer, list, object, text } from './schema';

const targetId = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

type TargetInput = { targetUid: number };
type GiftInput = TargetInput & { itemKey?: 'peiyuan' | 'zhuji' };
const targetResult = object({ targetUid: integer, message: text });

function targetAction(action: '传功' | '赐福' | '赐丹' | '拜师') {
  return (data: unknown, input: TargetInput) => {
    const result = parseMasterTargetAction(data, action);
    const row = data as Record<string, unknown>;

    if (result.outcome !== 'result' || row.targetUid !== input.targetUid) {
      throw new Error('师徒操作目标回执不匹配');
    }

    return { targetUid: input.targetUid, message: result.message };
  };
}

function proposalList(data: unknown) {
  const result = parseMasterDecision(data);

  if (result.outcome !== 'list') {
    throw new Error('师徒申请列表回执不匹配');
  }

  return {
    received: result.received.map(row => {
      if (
        !Number.isSafeInteger(row.id) ||
        row.id <= 0 ||
        !Number.isSafeInteger(row.fromUserId) ||
        row.fromUserId <= 0 ||
        typeof row.createdAt !== 'string' ||
        !row.createdAt
      ) {
        throw new Error('师徒申请数据不完整');
      }

      return row;
    })
  };
}

const supportResult = object({
  message: text,
  plan: text,
  canConfirm: boolean,
  count: integer,
  items: list(object({ discipleId: integer, count: integer, itemKey: text, reason: text }, ['itemKey', 'reason']))
});

function parseSupport(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('师门扶持回执不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    typeof row.message !== 'string' ||
    typeof row.plan !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.plan) ||
    typeof row.canConfirm !== 'boolean' ||
    !Number.isSafeInteger(row.count) ||
    Number(row.count) < 0 ||
    !Array.isArray(row.items)
  ) {
    throw new Error('师门扶持回执不完整');
  }
  for (const item of row.items) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !Number.isSafeInteger(item.discipleId) ||
      item.discipleId <= 0 ||
      !Number.isSafeInteger(item.count) ||
      item.count < 0 ||
      (item.reason !== undefined && typeof item.reason !== 'string') ||
      (item.itemKey !== undefined && typeof item.itemKey !== 'string')
    ) {
      throw new Error('师门扶持明细不完整');
    }
  }

  return row;
}

function supportPreview(action: 'bless' | 'gift') {
  const label = action === 'bless' ? '赐福' : '赐丹';

  return observation(
    `预览一键${label}的徒弟、次数和消耗；不执行操作，canConfirm 为真时可用原 plan 确认。`,
    action === 'bless' ? 'master.bless-all' : 'master.gift-all',
    object({}),
    supportResult,
    () => `/一键${label}`,
    parseSupport,
    () => ({ plan: '' })
  );
}

function supportConfirm(action: 'bless' | 'gift') {
  const label = action === 'bless' ? '赐福' : '赐丹';

  return mutation<{ plan: string }>(
    `确认一键${label}的原预览摘要；状态变化时服务端拒绝，逐徒弟结算可能部分成功，按返回明细报告。`,
    action === 'bless' ? 'master.bless-all' : 'master.gift-all',
    object({ plan: { type: 'string', minLength: 64, maxLength: 64 } }),
    supportResult,
    input => `/一键${label} 确认 ${input.plan}`,
    (data, input) => {
      const result = parseSupport(data);

      if (result.plan !== input.plan || result.canConfirm !== false) {
        throw new Error('师门扶持确认回执不匹配');
      }

      return result;
    },
    input => ({ plan: input.plan }),
    input => {
      if (!/^[a-f0-9]{64}$/.test(input.plan)) {
        throw new ExposeError('INVALID_INPUT', '请使用原师门扶持预览的完整摘要');
      }
    }
  );
}

export const masterActions = {
  preview_bless_all_disciples: supportPreview('bless'),
  confirm_bless_all_disciples: supportConfirm('bless'),
  preview_gift_all_disciples: supportPreview('gift'),
  confirm_gift_all_disciples: supportConfirm('gift'),
  get_master_info: observation(
    '查询本人师承、徒弟、日常培养和出师进度；infoJson 包含服务端完整师门信息。查询可能触发服务端生命周期处理。',
    'master.info',
    object({}),
    object({ allowed: boolean, hasMasterSide: boolean, discipleIds: list(integer), infoJson: text }),
    () => '/我的师门',
    data => {
      const info = parseMasterInfo(data);
      const discipleIds = (info.masterSide?.disciples ?? []).map(row => {
        if (!Number.isSafeInteger(row.discipleUserId) || row.discipleUserId <= 0) {
          throw new Error('徒弟编号无效');
        }

        return row.discipleUserId;
      });

      return { allowed: info.access.allowed, hasMasterSide: info.masterSide !== null, discipleIds, infoJson: JSON.stringify(info) };
    }
  ),
  teach_all_disciples: mutation(
    '一键为徒弟传功；按服务端逐个结算，items 记录每位徒弟实际次数和失败原因，可能部分成功。',
    'master.teach-all',
    object({}),
    object({ message: text, count: integer, items: list(object({ discipleId: integer, count: integer, reason: text }, ['reason'])) }),
    () => '/一键传功',
    data => {
      const { message } = parseMasterAction(data);
      const row = data as Record<string, unknown>;

      if (!Number.isSafeInteger(row.count) || Number(row.count) < 0 || !Array.isArray(row.items)) {
        throw new Error('批量传功回执不完整');
      }
      const items = row.items.map((value: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('批量传功明细无效');
        }
        const item = value as Record<string, unknown>;

        if (
          !Number.isSafeInteger(item.discipleId) ||
          Number(item.discipleId) <= 0 ||
          !Number.isSafeInteger(item.count) ||
          Number(item.count) < 0 ||
          (item.reason !== undefined && typeof item.reason !== 'string')
        ) {
          throw new Error('批量传功明细无效');
        }

        return { discipleId: item.discipleId, count: item.count, ...(item.reason !== undefined ? { reason: item.reason } : {}) };
      });

      return { message, count: row.count, items };
    }
  ),
  get_master_applications: observation(
    '查询本人收到的待处理拜师申请；申请编号和时间仅反映本次快照。',
    'master.binding-accept',
    object({}),
    object({ received: list(object({ id: integer, fromUserId: integer, fromName: text, fromRealm: text, createdAt: text })) }),
    () => '/同意拜师',
    data => proposalList(data),
    () => ({ discipleArg: '' })
  ),
  get_master_graduation_applications: observation(
    '查询本人收到的待处理出师申请；出师申请记录可能复用，编号不能单独视作申请版本。',
    'master.graduation-accept',
    object({}),
    object({ received: list(object({ id: integer, fromUserId: integer, fromName: text, fromRealm: text, createdAt: text })) }),
    () => '/同意出师',
    data => proposalList(data),
    () => ({ discipleArg: '' })
  ),
  teach_disciple: mutation<TargetInput>(
    '向指定徒弟传功；目标关系、次数和奖励以服务端结算为准。',
    'master.teach',
    object({ targetUid: targetId }),
    targetResult,
    input => `/传功 ${input.targetUid}`,
    targetAction('传功'),
    input => ({ targetArg: String(input.targetUid) })
  ),
  bless_disciple: mutation<TargetInput>(
    '向指定徒弟赐福；服务端校验关系、次数和消耗。',
    'master.bless',
    object({ targetUid: targetId }),
    targetResult,
    input => `/赐福 ${input.targetUid}`,
    targetAction('赐福'),
    input => ({ targetArg: String(input.targetUid) })
  ),
  gift_disciple_pill: mutation<GiftInput>(
    '向指定徒弟赐丹；可指定培元丹或筑基丹，未指定时由服务端选择，服务端校验库存与资格。',
    'master.gift',
    object({ targetUid: targetId, itemKey: { type: 'string', enum: ['peiyuan', 'zhuji'] } }, ['itemKey']),
    targetResult,
    input => `/赐丹 ${input.targetUid}${input.itemKey ? ` ${input.itemKey === 'peiyuan' ? '培元丹' : '筑基丹'}` : ''}`,
    targetAction('赐丹'),
    input => ({ targetArg: String(input.targetUid), ...(input.itemKey ? { itemKey: input.itemKey } : {}) })
  ),
  apply_for_master: mutation<TargetInput>(
    '向指定玩家申请拜师；成功仅代表申请已提交，不代表师徒关系已建立。',
    'master.apply',
    object({ targetUid: targetId }),
    targetResult,
    input => `/拜师 ${input.targetUid}`,
    targetAction('拜师'),
    input => ({ targetArg: String(input.targetUid) })
  ),
  apply_master_graduation: mutation(
    '申请出师；成功仅代表服务端受理，后续结果以师门状态为准。',
    'master.graduation-apply',
    object({}),
    object({ message: text }),
    () => '/申请出师',
    parseMasterAction
  ),
  claim_master_title: mutation(
    '领取符合服务端条件的师门称号；资格和重复领取由服务端校验。',
    'master.title-claim',
    object({}),
    object({ title: text }),
    () => '/领取师门称号',
    parseMasterClaimTitle
  )
};
