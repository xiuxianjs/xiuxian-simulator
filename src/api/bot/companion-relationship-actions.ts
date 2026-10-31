import { repeatPresentationHeaders } from './repeat-presentation';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type CompanionRelationshipMutation = { success: boolean; message: string };
export type CompanionBreakupMutation = CompanionRelationshipMutation & { narrativeText: string };
export type CompanionDualCultivation = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  success: boolean;
  experienceGained: number;
  creditedExperience?: number;
  partnerCreditedExperience?: number;
  tongxinGained: number;
  partnerId: number;
};

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣结算响应不完整');
  }

  return value as Record<string, unknown>;
}

function mutation(value: unknown): CompanionRelationshipMutation {
  const data = row(value);

  if (typeof data.success !== 'boolean' || typeof data.message !== 'string') {
    throw new Error('道侣结算响应不完整');
  }

  return { success: data.success, message: data.message };
}

export function parseBackendCompanionDualCultivation(value: unknown): CompanionDualCultivation {
  const data = row(value);

  if (
    typeof data.success !== 'boolean' ||
    typeof data.experienceGained !== 'number' ||
    !Number.isSafeInteger(data.experienceGained) ||
    typeof data.tongxinGained !== 'number' ||
    !Number.isSafeInteger(data.tongxinGained) ||
    typeof data.partnerId !== 'number' ||
    !Number.isSafeInteger(data.partnerId) ||
    data.partnerId <= 0 ||
    (data.creditedExperience !== undefined && !Number.isSafeInteger(data.creditedExperience)) ||
    (data.partnerCreditedExperience !== undefined && !Number.isSafeInteger(data.partnerCreditedExperience))
  ) {
    throw new Error('双修结算响应不完整');
  }

  return {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
    success: data.success,
    experienceGained: data.experienceGained,
    ...(data.creditedExperience === undefined ? {} : { creditedExperience: data.creditedExperience as number }),
    ...(data.partnerCreditedExperience === undefined ? {} : { partnerCreditedExperience: data.partnerCreditedExperience as number }),
    tongxinGained: data.tongxinGained,
    partnerId: data.partnerId
  };
}

function requireBid(bid: string | undefined, action: string): string {
  if (!bid) {
    throw new Error(`${action}缺少平台身份`);
  }

  return bid;
}

export async function breakupBackendCompanion(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<CompanionBreakupMutation> {
  const data = await requestBackend(requireBid(bid, '解除道侣'), 'delete_players_id_companion', { path: { id: uid }, ...writeContext(request) });
  const result = mutation(data);
  const narrativeText = row(data).narrativeText;

  if (typeof narrativeText !== 'string' || !narrativeText.trim()) {
    throw new Error('解除道侣响应缺少服务端叙事');
  }

  return { ...result, narrativeText };
}

export async function upgradeBackendCompanionOath(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<CompanionRelationshipMutation> {
  return mutation(await requestBackend(requireBid(bid, '升级誓约'), 'post_players_id_companion_oath_upgrade', { path: { id: uid }, ...writeContext(request) }));
}

export async function dualCultivateBackendCompanion(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<CompanionDualCultivation> {
  return parseBackendCompanionDualCultivation(
    await requestBackend(requireBid(bid, '双修'), 'post_players_id_companion_dual_cultivation', {
      headers: repeatPresentationHeaders(repeatCommand),
      path: { id: uid },
      ...writeContext(request)
    })
  );
}
