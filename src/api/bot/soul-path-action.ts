import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import { parseSoulPathReceipt, type SoulPathReceipt, type SoulPathKey } from '../schemas/soul-path-receipt';

export type SoulPathAction = 'switch' | 'advance' | 'reroll';
export type SoulPathActionPreview = { token: string; message: string };
export type SoulPathActionResult = {
  action: SoulPathAction;
  path?: SoulPathReceipt;
  nurture?: {
    direction: string;
    directionName: string;
    tier: string;
    tierName: string;
    stabilityBefore: number;
    stabilityAfter: number;
    insightGained: number;
    proficiencyGained: number;
    extraItems: Array<{ name: string; quantity: number }>;
  };
};

type Row = Record<string, unknown>;
const row = (value: unknown, message: string): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Row;
};
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

export async function previewBackendSoulPathAction(
  bid: string | undefined,
  uid: number,
  action: SoulPathAction,
  target: SoulPathKey | null,
  request?: BackendRequestContext
): Promise<SoulPathActionPreview> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseSoulActionPreview(
    await requestBackend(bid, 'post_players_id_soul_path_action_preview', {
      path: { id: uid },
      body: { action, ...(action === 'switch' ? { pathKey: target } : {}) },
      ...writeContext(request)
    })
  );
}

export function parseSoulActionPreview(data: unknown): SoulPathActionPreview {
  const value = row(data, '道途操作预览响应不完整');

  if (typeof value.token !== 'string' || !/^[0-9a-f-]{36}$/.test(value.token) || typeof value.message !== 'string') {
    throw new Error('道途操作预览响应不完整');
  }

  return { token: value.token, message: value.message };
}

export async function confirmBackendSoulPathAction(
  bid: string | undefined,
  uid: number,
  token: string,
  request?: BackendRequestContext
): Promise<SoulPathActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseSoulActionResult(
    await requestBackend(bid, 'post_players_id_soul_path_action_confirm', { path: { id: uid }, body: { token }, ...writeContext(request) })
  );
}

export function parseSoulActionResult(data: unknown): SoulPathActionResult {
  const value = row(data, '道途操作确认响应不完整');

  if (value.action !== 'switch' && value.action !== 'advance' && value.action !== 'reroll') {
    throw new Error('道途操作确认响应不完整');
  }
  if (value.action === 'reroll') {
    const nurture = row(value.nurture, '神魂重选响应不完整');

    if (
      typeof nurture.direction !== 'string' ||
      typeof nurture.directionName !== 'string' ||
      typeof nurture.tier !== 'string' ||
      typeof nurture.tierName !== 'string' ||
      !integer(nurture.stabilityBefore) ||
      !integer(nurture.stabilityAfter) ||
      !integer(nurture.insightGained) ||
      !integer(nurture.proficiencyGained) ||
      !Array.isArray(nurture.extraItems)
    ) {
      throw new Error('神魂重选响应不完整');
    }

    return {
      action: value.action,
      nurture: {
        direction: nurture.direction,
        directionName: nurture.directionName,
        tier: nurture.tier,
        tierName: nurture.tierName,
        stabilityBefore: nurture.stabilityBefore,
        stabilityAfter: nurture.stabilityAfter,
        insightGained: nurture.insightGained,
        proficiencyGained: nurture.proficiencyGained,
        extraItems: nurture.extraItems.map(item => {
          const fact = row(item, '神魂重选响应不完整');

          const quantity = fact.quantity;

          if (typeof fact.name !== 'string' || typeof quantity !== 'number' || !Number.isSafeInteger(quantity)) {
            throw new Error('神魂重选响应不完整');
          }

          return { name: fact.name, quantity };
        })
      }
    };
  }

  return {
    action: value.action,
    path: parseSoulPathReceipt(value.path, '道途操作确认响应不完整')
  };
}
