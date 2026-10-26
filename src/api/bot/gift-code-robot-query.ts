import { extractCode } from '@src/response/redeemCode/claim/command';
import { parseGiftCodeRedeemResult } from './gift-code-redeem';

export function giftCodeArguments(text: string) {
  return { code: extractCode(text).replace(/\s+/g, '').trim().toUpperCase() };
}
export function parseRobotGiftCode(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('礼包码响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage') {
    return { code: 'NO_CODE' as const };
  }
  if (row.outcome !== 'result' || !['custom', 'comeback', 'test'].includes(String(row.kind))) {
    throw new Error('礼包码响应不完整');
  }
  const data = parseGiftCodeRedeemResult(row.data, row.kind === 'custom' ? '礼包码兑换' : '远端礼包码兑换');
  const detail = row.data as Record<string, unknown>;

  if (detail.pendingConfirm !== undefined && typeof detail.pendingConfirm !== 'boolean') {
    throw new Error('礼包码核销状态不完整');
  }
  const code = row.kind === 'custom' ? ('CUSTOM_SUCCESS' as const) : row.kind === 'comeback' ? ('COMEBACK_SUCCESS' as const) : ('TEST_SUCCESS' as const);

  return { code, displayMsg: data.message, rewardSummary: data.rewardSummary, pendingConfirm: row.kind !== 'custom' && detail.pendingConfirm === true };
}
export function parseRobotGiftHub(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Record<string, unknown>).outcome !== 'menu') {
    throw new Error('兑换码入口响应不完整');
  }

  return { outcome: 'menu' as const };
}

export function parseRobotOldGameCode(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    typeof (value as Record<string, unknown>).giftCode !== 'string' ||
    !(value as { giftCode: string }).giftCode.trim()
  ) {
    throw new Error('凡人修仙礼包码响应不完整');
  }

  return { giftCode: (value as { giftCode: string }).giftCode };
}
