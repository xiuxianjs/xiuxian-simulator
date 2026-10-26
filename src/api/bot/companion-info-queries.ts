import type { CompanionInfoQueryData } from '../schemas/companion-info-query';
import { requestBackend } from './client';
export async function getBackendCompanionInfo(bid: string | undefined, uid: number): Promise<CompanionInfoQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_companion', { path: { id: uid } });

  return parseCompanionInfo(data);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣接口数据不完整');
  }

  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('道侣接口数据不完整');
  }

  return value;
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('道侣接口数据不完整');
  }

  return value;
}

export function parseCompanionInfo(value: unknown): CompanionInfoQueryData {
  const row = record(value);
  const access = record(row.access);

  if (typeof access.canUseFifthLayerFeature !== 'boolean') {
    throw new Error('道侣接口数据不完整');
  }
  const result: CompanionInfoQueryData = {
    access: { canUseFifthLayerFeature: access.canUseFifthLayerFeature, realmName: nullableText(access.realmName) },
    noCompanionMessage: nullableText(row.noCompanionMessage),
    companion: null
  };

  if (row.companion !== null) {
    const p = record(row.companion);

    if (p.oathType !== 'normal' && p.oathType !== 'advanced') {
      throw new Error('道侣接口数据不完整');
    }
    const partnerId = integer(p.partnerId);

    if (partnerId < 0) {
      throw new Error('道侣接口数据不完整');
    }
    result.companion = {
      partnerId,
      partnerName: nullableText(p.partnerName),
      partnerRealm: nullableText(p.partnerRealm),
      displayPartnerName: text(p.displayPartnerName),
      displayPartnerRealm: text(p.displayPartnerRealm),
      intimacy: integer(p.intimacy),
      spiritBondLevel: text(p.spiritBondLevel),
      tongxin: integer(p.tongxin),
      oathType: p.oathType,
      blessingPercent: integer(p.blessingPercent),
      dualCultivationExp: integer(p.dualCultivationExp),
      dailyDualCultivationUsed: integer(p.dailyDualCultivationUsed),
      dailyDungeonUsed: integer(p.dailyDungeonUsed),
      dailyGiftUsed: integer(p.dailyGiftUsed),
      companionSince: nullableText(p.companionSince),
      companionMessage: text(p.companionMessage),
      anniversaryMessage: nullableText(p.anniversaryMessage)
    };
  }

  return result;
}
