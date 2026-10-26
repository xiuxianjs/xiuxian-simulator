import type { SeclusionEndData } from '../schemas/seclusion-end';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type { SeclusionEndData } from '../schemas/seclusion-end';

export async function endBackendSeclusion(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<SeclusionEndData> {
  if (!bid?.trim()) {
    throw new Error('返程请求缺少平台身份');
  }

  if (!Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('返程请求参数无效');
  }

  const data = await requestBackend(bid, 'post_players_id_seclusion_end', { path: { id: uid }, ...writeContext(request) });

  return parseSeclusionEnd(data);
}

export function parseSeclusionEnd(data: any): SeclusionEndData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('返程结算响应不完整');
  }

  if (
    typeof data.interrupted !== 'boolean' ||
    typeof data.spiritRefunded !== 'boolean' ||
    typeof data.penaltyApplied !== 'boolean' ||
    !Number.isSafeInteger(data.settledHours)
  ) {
    throw new Error('返程结算响应不完整');
  }

  if ('presenceText' in data && data.presenceText !== null && data.presenceText !== undefined && typeof data.presenceText !== 'string') {
    throw new Error('返程结算响应的道侣在场文案无效');
  }

  const view = data.view;

  if (data.creditedExperience !== undefined && !Number.isSafeInteger(data.creditedExperience)) {
    throw new Error('探索实际修为响应无效');
  }
  if (data.refundedSpirit !== undefined && (!Number.isSafeInteger(data.refundedSpirit) || data.refundedSpirit < 0)) {
    throw new Error('返程精力响应无效');
  }
  if (
    data.materialProgressPercent !== undefined &&
    (typeof data.materialProgressPercent !== 'number' ||
      !Number.isFinite(data.materialProgressPercent) ||
      data.materialProgressPercent < 0 ||
      data.materialProgressPercent >= 100)
  ) {
    throw new Error('秘境采集进度无效');
  }
  if (data.gatheredMaterialCount !== undefined && (!Number.isSafeInteger(data.gatheredMaterialCount) || data.gatheredMaterialCount < 0)) {
    throw new Error('秘境采集数量无效');
  }
  const kinds = ['refunded', 'interrupted', 'completed'];
  const textFields = ['title', 'introText', 'penaltyText', 'expBonusText'];
  const countFields = ['pillCount', 'rareDropTypeCount', 'rareDropTotalCount'];
  const flagFields = ['showHuanHunDan', 'showYangShenDan', 'showRareDrops'];

  if (
    !view ||
    typeof view !== 'object' ||
    Array.isArray(view) ||
    !kinds.includes(view.kind) ||
    textFields.some(field => typeof view[field] !== 'string') ||
    countFields.some(field => !Number.isSafeInteger(view[field]) || view[field] < 0) ||
    flagFields.some(field => typeof view[field] !== 'boolean')
  ) {
    throw new Error('返程结算响应的展示信息无效');
  }

  if (view.kind !== 'refunded' && (!data.rewards || !Array.isArray(data.rewards.rareDrops))) {
    throw new Error('返程结算响应的奖励信息无效');
  }

  if (data.rewards !== undefined) {
    const rewards = data.rewards;

    if (
      !rewards ||
      typeof rewards !== 'object' ||
      Array.isArray(rewards) ||
      ![rewards.experience, rewards.spiritStone, rewards.huanHunDan, rewards.yangShenDan, rewards.soulDew].every(Number.isSafeInteger) ||
      !Array.isArray(rewards.rareDrops) ||
      rewards.rareDrops.some(
        drop => !drop || typeof drop !== 'object' || Array.isArray(drop) || typeof drop.name !== 'string' || !Number.isSafeInteger(drop.quantity)
      )
    ) {
      throw new Error('返程结算响应的奖励信息无效');
    }
  }

  return data;
}
